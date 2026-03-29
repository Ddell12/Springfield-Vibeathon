# Isolate esbuild Bundling via Child Process

## Context

The Next.js `/api/generate` route runs esbuild **in-process**, sharing the V8 heap with the entire dev server. Each build copies a 370MB WAB scaffold, loads esbuild's AST, and holds multi-MB bundle strings. With 2-3 concurrent generations, the process exceeds its 4.3GB heap limit and crashes with `FATAL ERROR: JavaScript heap out of memory`.

**Why not Convex actions?** Investigated thoroughly — Convex actions have no filesystem access, can't run native binaries (esbuild is Go-compiled), have a 512MB memory limit, and don't support streaming. All four are hard blockers.

**Solution:** Spawn esbuild as a **child process**. Each build gets its own V8 heap that's freed when the child exits. The Next.js server stays lightweight (~500MB), and each build child uses ~1-1.5GB independently.

---

## Architecture

### Current (all in-process — causes OOM):
```
Next.js Process (shared 4.3GB heap):
  Request 1: Claude streaming + esbuild (~2GB)  ─┐
  Request 2: Claude streaming + esbuild (~2GB)  ─┤→ OOM!
```

### New (child process — memory isolated):
```
Next.js Process (~500MB):
  Request 1: Claude streaming → spawn child → receive HTML → send SSE
  Request 2: Claude streaming → spawn child → receive HTML → send SSE

Child 1: esbuild → stdout JSON → exit (memory freed)
Child 2: esbuild → stdout JSON → exit (memory freed)
```

---

## Phase 1: Create Bundle Worker Script

### New file: `scripts/bundle-worker.mjs`

A standalone Node.js ESM script (~120 lines) that:
- Receives `buildDir` path as `process.argv[2]`
- Runs esbuild with identical config to current `route.ts:191-225`
- Processes CSS (strip @tailwind, convert @apply, unwrap @layer)
- Extracts Tailwind config `theme.extend` object
- Inlines `tailwindcss-animate` CSS
- Assembles the self-contained HTML document
- Writes `JSON.stringify({ ok: true, html: bundleHtml })` to stdout
- On error: `JSON.stringify({ ok: false, error: message })` + exit 1

Uses `.mjs` extension (not `.ts`) so it runs directly via `node` without compilation — critical for Vercel where `tsx` isn't available at runtime.

esbuild import uses `createRequire` (CJS) since Next.js keeps it as a `serverExternalPackage`:
```javascript
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const esbuild = require("esbuild");
```

**Extracted from `route.ts`:** Lines 178-332 (esbuild config, CSS processing, Tailwind extraction, animateCss constant, HTML assembly template).

---

## Phase 2: Create Child Process Spawner

### New file: `src/app/api/generate/run-bundle-worker.ts`

```typescript
import { execFile } from "child_process";
import { join } from "path";

export function runBundleWorker(buildDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const workerPath = join(process.cwd(), "scripts", "bundle-worker.mjs");
    execFile(
      process.execPath, // same node binary
      [workerPath, buildDir],
      { maxBuffer: 50 * 1024 * 1024, timeout: 60_000 },
      (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`Bundle worker failed: ${error.message}\n${stderr?.slice(0, 500)}`));
        }
        try {
          const result = JSON.parse(stdout);
          if (result.ok) resolve(result.html);
          else reject(new Error(result.error));
        } catch {
          reject(new Error(`Invalid worker output: ${stdout.slice(0, 200)}`));
        }
      }
    );
  });
}
```

Key settings:
- `maxBuffer: 50MB` — bundleHtml can be several MB
- `timeout: 60_000` — kills child if stuck for 60s
- Uses `process.execPath` to ensure same Node binary

---

## Phase 3: Create Concurrency Limiter

### New file: `src/app/api/generate/build-limiter.ts`

Module-level semaphore limiting concurrent builds to 2 (protects both local dev and Vercel containers):

```typescript
const MAX_CONCURRENT = 2;
const QUEUE_TIMEOUT = 30_000;
let active = 0;
const queue: Array<{ resolve: (release: () => void) => void; reject: (err: Error) => void }> = [];

export async function acquireBuildSlot(): Promise<() => void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return createRelease();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = queue.findIndex(q => q.resolve === resolve);
      if (idx >= 0) queue.splice(idx, 1);
      reject(new Error("Server busy — too many concurrent builds. Try again."));
    }, QUEUE_TIMEOUT);
    queue.push({
      resolve: (release) => { clearTimeout(timer); resolve(release); },
      reject,
    });
  });
}

function createRelease(): () => void {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    active--;
    const next = queue.shift();
    if (next) { active++; next.resolve(createRelease()); }
  };
}
```

---

## Phase 4: Refactor route.ts

### Modified file: `src/app/api/generate/route.ts`

Replace the inline esbuild section (lines 172-357) with:

```typescript
import { runBundleWorker } from "./run-bundle-worker";
import { acquireBuildSlot } from "./build-limiter";

// ... inside the stream start() callback, after the tool runner loop:

if (!isFlashcardMode && buildDir && collectedFiles.size > 0) {
  send("status", { status: "bundling" });
  send("activity", { type: "thinking", message: "Bundling your app..." });

  const release = await acquireBuildSlot();
  try {
    const bundleHtml = await runBundleWorker(buildDir);
    if (bundleHtml.length < 200) throw new Error("bundle HTML is suspiciously small");

    send("activity", { type: "thinking", message: "Almost ready..." });
    send("bundle", { html: bundleHtml });
    buildSucceeded = true;

    // Persist bundle for session resume
    try {
      await convex.mutation(api.generated_files.upsertAutoVersion, {
        sessionId, path: "_bundle.html", contents: bundleHtml,
      });
    } catch (err) {
      console.error("[generate] Failed to persist bundle:", err);
    }
  } catch (buildError) {
    const errMsg = buildError instanceof Error ? buildError.message : String(buildError);
    console.error("[generate] Bundle worker failed:", errMsg.slice(0, 1000));
    send("activity", { type: "complete", message: `Build failed: ${errMsg.slice(0, 200)}` });
  } finally {
    release();
  }
}
```

**What's removed from route.ts:**
- `import * as esbuild from "esbuild"` (no longer needed in main process)
- Lines 178-350: esbuild config, CSS processing, Tailwind extraction, animateCss, HTML assembly
- These all move to `scripts/bundle-worker.mjs`

**What stays in route.ts:**
- The `send()` progress events (SSE can only come from the route handler)
- Bundle persistence to Convex
- The `buildSucceeded` flag and error handling

---

## Phase 5: Update Config

### Modified file: `next.config.ts`

Add the worker script to the serverless bundle:

```typescript
outputFileTracingIncludes: {
  "/api/generate": [
    "./artifacts/wab-scaffold/**/*",
    "./scripts/bundle-worker.mjs",
  ],
},
```

### New file: `vercel.json`

Set memory and timeout for the generate function:

```json
{
  "functions": {
    "src/app/api/generate/route.ts": {
      "memory": 3008,
      "maxDuration": 300
    }
  }
}
```

---

## Critical Files Summary

| File | Action | Lines |
|------|--------|-------|
| `scripts/bundle-worker.mjs` | **CREATE** | ~120 lines — standalone esbuild bundler |
| `src/app/api/generate/run-bundle-worker.ts` | **CREATE** | ~30 lines — child process spawner |
| `src/app/api/generate/build-limiter.ts` | **CREATE** | ~35 lines — concurrency semaphore |
| `src/app/api/generate/route.ts` | **MODIFY** | Remove ~180 lines of inline bundling, replace with ~25 lines calling worker |
| `next.config.ts` | **MODIFY** | Add `bundle-worker.mjs` to outputFileTracingIncludes |
| `vercel.json` | **CREATE** | Function memory/timeout config |

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Child OOM (SIGKILL) | `execFile` error with `signal: 'SIGKILL'` → SSE build error |
| Child timeout (60s) | `execFile` kills child → SSE build error |
| esbuild errors | Worker returns `{ ok: false, error }` → SSE build error |
| Concurrency full + 30s wait | `acquireBuildSlot` rejects → SSE "server busy" error |
| Worker script missing | `execFile` ENOENT → SSE error |

---

## Verification

1. **Standalone worker test:** Copy a scaffold to /tmp, write a test `App.tsx`, run:
   ```bash
   node scripts/bundle-worker.mjs /tmp/test-build-dir
   ```
   Verify valid JSON with `ok: true` and HTML output.

2. **Integration test:** Start dev server, generate an app, confirm preview renders. Check that the Node process memory stays under 2GB (was hitting 15GB before).

3. **Concurrent test:** Open 3 browser tabs, fire generate simultaneously. Confirm:
   - First 2 proceed, 3rd queues briefly then proceeds
   - No OOM crash
   - All 3 get valid previews

4. **Vercel deployment:** Push to preview branch, test generate on Vercel. Check function logs for memory usage via `process.memoryUsage()`.

5. **Existing tests:** Run `npx vitest run` — no test changes needed since tests don't exercise the bundling layer.
