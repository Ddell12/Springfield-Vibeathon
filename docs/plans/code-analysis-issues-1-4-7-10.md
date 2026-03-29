# Code Path Analysis: Builder Pipeline & SSE Streaming Issues

Analysis Date: 2026-03-26
Scope: Issues #1, #4, #7, #10 - Builder preview pipeline failures and SSE streaming contradictions

---

## ISSUE 1: Parcel Build Failure Silently Swallowed (Blank Preview)

### Code Path Overview

**Entry Point:** `src/app/api/generate/route.ts` lines 191-224

The Parcel bundling happens in the **non-flashcard mode only** (line 165: `if (!isFlashcardMode)`).

### Detailed Flow

#### Line 192-206: Build Initiation
```
Line 191-192:  if (collectedFiles.size > 0) {
               send("status", { status: "bundling" });
```
- Only runs if LLM wrote files to `collectedFiles` Map
- Sends "bundling" status to client (which is suppressed in use-streaming.ts line 119)

#### Line 196-206: Parcel Execution (THE PROBLEM ZONE)
```
Line 196-223:  try {
                 await execAsync(
                   "pnpm exec parcel build index.html ...",
                   { cwd: buildDir, timeout: 30000 }
                 );
                 const bundlePath = join(buildDir!, "bundle.html");
                 if (!existsSync(bundlePath)) throw new Error("Parcel produced no bundle.html");
                 const bundleHtml = readFileSync(bundlePath, "utf-8");
                 if (bundleHtml.length < 100) throw new Error("bundle.html is suspiciously small");
                 send("bundle", { html: bundleHtml });
                 buildSucceeded = true;
               } catch (buildError) {
                 console.error("[generate] Parcel build failed:", buildError);
                 send("activity", { type: "complete", message: "Build failed — check the Code panel for your files" });
                 // Don't throw — still persist files and send done event
               }
```

**CRITICAL ISSUE:** The catch block (line 219-223) **swallows all errors silently** and does NOT re-throw:
- Line 220: Logs error to server console (user never sees)
- Line 221: Sends activity event only (no error event)
- Line 222: Comment explicitly says "Don't throw"
- Falls through to line 225+ and sends "done" event as if generation succeeded

### What Files Are Expected

The Parcel build expects:
1. **index.html** (line 199: template file) - Exists in wab-scaffold (artifacts/wab-scaffold/index.html, lines 1-16)
2. **src/main.tsx** (line 14 of index.html: `<script type="module" src="/src/main.tsx"></script>`)
   - Template exists at `artifacts/wab-scaffold/src/main.tsx` (lines 1-10)
   - **IMPORTS MUST MATCH:** Line 4: `import App from './App.tsx'`
3. **src/App.tsx** (line 4 of main.tsx)
   - Template exists at `artifacts/wab-scaffold/src/App.tsx` (lines 1-7)
   - **LLM MUST WRITE THIS FILE** for Parcel to find it

### System Prompt Reference

**File:** `src/features/builder/lib/agent-prompt.ts` lines 250-254

```typescript
250: /**
251:  * File Generation Rules
252:  *
...
250:  * Always write `src/App.tsx` — this is the entry point, mounted by main.tsx
251:  * Create additional files as needed for custom components, types, data, or utilities
252:  * File paths must start with `src/` — you cannot modify root files
253:  * Do NOT overwrite pre-built files: `src/components/ui/*`, ...
```

**CONSTRAINT:** Agent prompt line 250 instructs LLM to "Always write `src/App.tsx`" but there is **NO VALIDATION** that App.tsx was actually written before Parcel runs.

### Root Cause Chain

1. LLM generates code but forgets or fails to write `src/App.tsx`
2. Line 192: Parcel runs because `collectedFiles.size > 0` (other files exist)
3. Line 198-201: `parcel build index.html` fails (missing App.tsx import chain)
4. Line 219-223: Exception caught, logged to server only, falls through silently
5. Line 284: "done" event sent with `buildFailed: false` (because `buildSucceeded = false` but check uses `!buildSucceeded && collectedFiles.size > 0` — see Issue #4)
6. Client receives "done" with no "bundle" event, showing blank preview

---

## ISSUE 4: Contradictory State Messages

### Code Path Overview

**Location 1:** `src/app/api/generate/route.ts` lines 280-284

```typescript
280:  await convex.mutation(api.sessions.setLive, { sessionId });
281:
282:  send("activity", { type: "complete", message: "App is ready!" });
283:  send("status", { status: "live" });
284:  send("done", { sessionId, files: fileArray, buildFailed: !buildSucceeded && collectedFiles.size > 0 });
```

**Location 2:** `src/features/builder/hooks/use-streaming.ts` lines 187-196

```typescript
187:        case "done":
188:          // Flush any buffered tokens before marking as live
189:          if (rafIdRef.current) {
190:            cancelAnimationFrame(rafIdRef.current);
191:            rafIdRef.current = undefined;
192:          }
193:          setStreamingText(tokenBufferRef.current);
194:          setStatus("live");
195:          if (sseEvent.sessionId) setSessionId(sseEvent.sessionId);
196:          break;
```

### The Contradiction

**Scenario 1: Successful Generation with Bundle**
- Line 283: `send("status", { status: "live" })`
- Line 284: `send("done", { buildFailed: false })`
- Line 187-194: Hook receives "done", sets status to "live"
- **State:** ✓ Consistent (live → live)

**Scenario 2: Generation with File Writes but Build Failure**
- Line 219-222: Build fails, caught, falls through
- Line 280: `setLive` called (persists to DB)
- Line 283: `send("status", { status: "live" })`
- Line 284: `send("done", { buildFailed: !buildSucceeded && collectedFiles.size > 0 })`
  - `buildSucceeded = false` (never set to true on line 207)
  - `collectedFiles.size > 0` (files were written)
  - **Result:** `buildFailed: true`
- Hook receives "done" with `buildFailed: true` but status already set to "live"
- **UI Message:** "App is ready!" + status=live + buildFailed=true
- **User Sees:** ✗ CONTRADICTION: "Ready" but marked as "failed"

**Scenario 3: No Files Written (LLM Generated Only Discussion)**
- Line 191-192: `if (collectedFiles.size > 0)` — Parcel block skipped
- `buildSucceeded` remains `false` (line 106)
- Line 280: `setLive` called anyway
- Line 284: `buildFailed: !false && 0 > 0` = `false` (correct!)
- **State:** ✓ Consistent (status=live, buildFailed=false)

### Why It Contradicts

**The `buildFailed` calculation is WRONG:**

```typescript
Line 284: buildFailed: !buildSucceeded && collectedFiles.size > 0
```

This evaluates as:
- ✓ `true` when build fails AND files exist (correct — user should know)
- ✗ `false` when build fails AND no files exist (incorrect — still failed!)
- ✓ `false` when build succeeds (correct)
- ✓ `false` when no build attempted (correct)

**ISSUE:** When no files are written, the hook can't distinguish:
- Case A: Generation successful, no files to bundle (OK)
- Case B: Generation failed silently (NOT OK)

**Also:** There is **no null coercion of bundleHtml** before "done" event.
- Line 206: `send("bundle", { html: bundleHtml })`
- Line 284: "done" event sent later
- Line 182-185 in hook: "bundle" event sets `setBundleHtml(sseEvent.html)`
- Line 194: "done" event sets `setStatus("live")`
- **Problem:** If build failed, no "bundle" event was sent, so `bundleHtml` remains `null`
- But UI shows "live" status, implying bundle is ready

---

## ISSUE 7: Undefined buildDir in Flashcard Mode

### Code Path Overview

**Location:** `src/app/api/generate/route.ts` lines 124-140

```typescript
124:  const isFlashcardMode = mode === "flashcards";
125:  const systemPrompt = isFlashcardMode
126:    ? buildFlashcardSystemPrompt()
127:    : buildSystemPrompt();
128:
129:  const collectedFiles = new Map<string, string>();
130:  let assistantText = "";
131:
132:  if (!isFlashcardMode) {
133:    // Copy WAB scaffold to temp dir for this build
134:    buildDir = mkdtempSync(join(tmpdir(), "bridges-build-"));
135:    await cp(join(process.cwd(), "artifacts/wab-scaffold"), buildDir, { recursive: true });
136:  }
137:
138:  const tools = isFlashcardMode
139:    ? createFlashcardTools({ send, sessionId, convex })
140:    : createAgentTools({ send, sessionId, collectedFiles, convex, buildDir: buildDir! });
```

### The Problem

**Line 140:** `buildDir: buildDir!` — Non-null assertion used

In flashcard mode:
- Line 132: `if (!isFlashcardMode)` — skipped
- Line 105: `let buildDir: string | undefined;` — remains `undefined`
- Line 140: `buildDir!` — **non-null assertion forces TypeScript to accept undefined**
- Passed to `createAgentTools()` even though no tools are created in flashcard mode

In builder mode:
- Line 134: `buildDir = mkdtempSync(...)`
- Line 140: `buildDir!` — valid directory path

**Root Cause:** The non-null assertion `!` is a **type system lie** — it tells TypeScript to ignore the undefined possibility, but the value is actually undefined in flashcard mode (though never used).

**Why No Runtime Error:** Line 138-140 creates **different tools** based on mode:
- Flashcard mode: `createFlashcardTools()` doesn't use `buildDir` at all
- Builder mode: `createAgentTools()` does use `buildDir`

**Risk:** If code is refactored to pass `buildDir` to flashcard tools or use it elsewhere, it will crash.

---

## ISSUE 10: SSE Parser Null Coercion

### Code Path Overview

**Location 1:** `src/core/sse-events.ts` lines 22-54

```typescript
22: export function parseSSEEvent(event: string, data: unknown): SSEEvent | null {
23:   const d = data as Record<string, unknown>;
24:   switch (event) {
...
34:     case "file_complete":
35:       return { event: "file_complete", path: String(d.path ?? ""), contents: String(d.contents ?? "") };
...
46:     case "bundle":
47:       return { event: "bundle", html: String(d.html ?? "") };
```

**Location 2:** `src/core/sse-utils.ts` lines 5-29 (parseSSEChunks)

```typescript
22: try {
23:   events.push({ event: eventType, data: JSON.parse(dataLine) });
24: } catch {
25:   // Ignore malformed JSON
26: }
```

### The Coercion Issue

**File complete event (line 34-35):**
```typescript
path: String(d.path ?? ""),      // null → "", undefined → ""
contents: String(d.contents ?? "")  // null → "", undefined → ""
```

**Bundle event (line 46-47):**
```typescript
html: String(d.html ?? "")  // null → "", undefined → ""
```

**What happens:**
- If server sends `{ "path": null }` → parsed as `{ path: "" }`
- If server sends `{ "html": null }` → parsed as `{ html: "" }`
- If server sends `{ "html": undefined }` (JavaScript, not JSON) → parsed as `{ html: "" }`
- **Strings are never null**, but **data CAN be null from JSON**

**JSON Spec:** JSON can represent:
- `null` (null value)
- `undefined` (not allowed in JSON, becomes missing key)

So: `{ "html": null }` is valid JSON, becomes empty string after coercion.

### The Real Problem

**In use-streaming.ts (line 182-185):**
```typescript
case "bundle":
  setBundleHtml(sseEvent.html);  // Sets to "" if null
  onBundleRef.current?.(sseEvent.html);  // "" instead of null
  break;
```

**Issue:** Cannot distinguish between:
- User never sent bundle event (bundleHtml stays undefined)
- Server sent `{ "html": null }` (bundleHtml becomes "")
- Server sent `{ "html": "" }` (bundleHtml becomes "")

**Consequence:** UI cannot reliably show "no bundle" vs "empty bundle" vs "error during bundle".

---

## Summary Table: Cross-Issue Dependencies

| Issue | Root Cause | Affected Components | Severity |
|-------|-----------|-------------------|----------|
| #1 | Build exception swallowed (catch block) | Parcel bundler, SSE stream | CRITICAL |
| #4 | `buildFailed` calculation + "done" event logic | Status state machine, UI messages | HIGH |
| #7 | buildDir non-null assertion in flashcard mode | Type safety, refactoring risk | MEDIUM |
| #10 | SSE parser coerces null → "" | Bundle detection, error handling | MEDIUM |

---

## Key Files for Fixes

### Critical Paths
1. **src/app/api/generate/route.ts** (lines 191-224, 280-284)
   - Parcel build try-catch
   - "done" event buildFailed calculation
   - buildDir cleanup

2. **src/features/builder/hooks/use-streaming.ts** (lines 187-196)
   - "done" event handler
   - bundleHtml null handling

3. **src/core/sse-events.ts** (lines 22-54)
   - String() coercion of null values
   - Type definitions

### Scaffold Templates
4. **artifacts/wab-scaffold/index.html** (lines 1-16)
   - Entry point, expects main.tsx

5. **artifacts/wab-scaffold/src/main.tsx** (lines 1-10)
   - Imports App.tsx

6. **src/features/builder/lib/agent-prompt.ts** (line 250)
   - Instructs LLM to write src/App.tsx

7. **src/features/builder/lib/agent-tools.ts** (lines 24-36)
   - File path validation allowlist
   - Doesn't enforce App.tsx requirement

---

## Recommended Fix Priority

1. **HIGH:** Fix Issue #1 (Parcel build error reporting)
   - Change catch block to re-throw or track buildSucceeded properly
   
2. **HIGH:** Fix Issue #4 (buildFailed logic)
   - Send explicit error event instead of relying on buildFailed flag
   
3. **MEDIUM:** Fix Issue #10 (SSE coercion)
   - Use undefined instead of null, or return { html: string | null }
   
4. **LOW:** Fix Issue #7 (buildDir non-null assertion)
   - Use proper type narrowing, not `!` assertion

