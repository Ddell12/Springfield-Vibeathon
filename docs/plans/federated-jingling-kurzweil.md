# Plan: Fix All Vibeathon Review Issues

## Context

A 5-agent vibeathon judge review scored Bridges at **85/100**. This plan addresses all findings to push the score to ~92+. The review identified 3 critical, 8 high, 11 medium, and several low-priority issues across security, performance, correctness, code quality, and UX.

**Key constraint:** `allow-same-origin` cannot be removed from the iframe sandbox (breaks blob: URL script execution). We'll harden the iframe via CSP meta tags instead.

---

## Step 1: Security — Iframe CSP Hardening (instead of removing allow-same-origin)

**Files:**
- `artifacts/wab-scaffold/scripts/inline-bundle.cjs`
- `src/features/builder/components/preview-panel.tsx`

**What to do:**

1. In `inline-bundle.cjs`, after all inlining is complete (before `fs.writeFileSync`), inject a CSP `<meta>` tag into the `<head>` of the bundled HTML:
   ```js
   // After line 37, before writeFileSync:
   const cspTag = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: https:; font-src data: https://fonts.gstatic.com; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">`;
   html = html.replace('<head>', `<head>\n${cspTag}`);
   ```
   This restricts iframe content: no nested iframes, no form submissions, no fetch/XHR, no plugins, no base URL hijacking. Even with `allow-same-origin`, the CSP prevents most exploitation.

2. In `preview-panel.tsx:45`, add a comment explaining why `allow-same-origin` is required:
   ```tsx
   {/* allow-same-origin is required: blob: URLs need same-origin context for
       inline scripts to execute. CSP meta tag in bundle.html restricts capabilities
       (no fetch, no nested frames, no form submissions). See inline-bundle.cjs. */}
   sandbox="allow-scripts allow-same-origin"
   ```

---

## Step 2: Security — Rate Limiting on /api/generate

**Files:**
- `convex/convex.config.ts`
- `convex/rate_limits.ts` (new)
- `src/app/api/generate/route.ts`

**What to do:**

`@convex-dev/rate-limiter` is already in `package.json`. Wire it up:

1. Update `convex/convex.config.ts` to register the rate limiter component:
   ```ts
   import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
   const app = defineApp();
   app.use(rag);
   app.use(rateLimiter);
   ```

2. Create `convex/rate_limits.ts`:
   ```ts
   import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
   import { components } from "./_generated/api";

   export const rateLimiter = new RateLimiter(components.rateLimiter, {
     generateApp: { kind: "fixed window", rate: 5, period: MINUTE },
   });
   ```

3. Create `convex/rate_limit_check.ts` with a mutation that checks the rate limit:
   ```ts
   import { v } from "convex/values";
   import { mutation } from "./_generated/server";
   import { rateLimiter } from "./rate_limits";

   export const checkGenerateLimit = mutation({
     args: { key: v.string() },
     handler: async (ctx, args) => {
       const result = await rateLimiter.limit(ctx, "generateApp", { key: args.key });
       if (!result.ok) {
         throw new Error(`Rate limited. Retry after ${Math.ceil(result.retryAfter / 1000)}s`);
       }
     },
   });
   ```

4. In `route.ts`, after Zod validation (~line 66), add rate limit check using IP from headers:
   ```ts
   const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
   try {
     await convex.mutation(api.rate_limit_check.checkGenerateLimit, { key: ip });
   } catch (e) {
     return jsonErrorResponse(e instanceof Error ? e.message : "Rate limited", 429);
   }
   ```

---

## Step 3: Security — read_file Path Traversal Guard

**File:** `src/features/builder/lib/agent-tools.ts`

**What to do:** Add the same path traversal guard from `writeFile` to `readFile` (line 142-148):

```ts
run: async ({ path }) => {
  // Path traversal guard (matches write_file)
  const fullPath = join(ctx.buildDir, path);
  const resolved = resolve(fullPath);
  if (!resolved.startsWith(resolve(ctx.buildDir))) {
    throw new ToolError(`Path traversal blocked: ${path}`);
  }
  if (!existsSync(fullPath)) {
    throw new ToolError(`Error: File not found: ${path}`);
  }
  return readFileSync(fullPath, "utf-8");
},
```

---

## Step 4: Security — Restrict voiceId Passthrough

**File:** `convex/aiActions.ts`

**What to do:** Remove the `voiceId` arg and only allow the 3 known voice names through `VOICE_MAP`:

```ts
args: {
  text: v.string(),
  voice: v.optional(v.string()), // friendly name only
},
handler: async (ctx, args) => {
  const resolvedVoiceId = (args.voice ? VOICE_MAP[args.voice] : undefined) ?? VOICE_MAP["warm-female"];
  // ... rest unchanged
```

Check all callers first — grep for `voiceId` in src/ and convex/ to ensure nothing passes the raw ID.

---

## Step 5: Security — STT Audio Size Limit

**File:** `convex/stt.ts`

**What to do:** Add a size check before decoding (line 17):

```ts
// Max 5MB base64 = ~3.75MB audio
const MAX_AUDIO_BASE64_LENGTH = 5 * 1024 * 1024;
if (args.audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
  throw new Error("Audio too large. Maximum 5MB.");
}
const audioBuffer = Buffer.from(args.audioBase64, "base64");
```

---

## Step 6: Security — Add Security Headers

**File:** `next.config.ts`

**What to do:** Add missing headers:

```ts
headers: [
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
],
```

---

## Step 7: Security — userId Accepted as Client Argument

**Files:** `convex/sessions.ts`, `convex/flashcard_decks.ts`

**What to do:** Add a comment noting this is pre-auth placeholder, and ensure `userId` is not used for any authorization logic (it currently isn't). No code change needed — just add a clear comment:

```ts
// userId: v.optional(v.string()),
// ⚠️ Pre-auth placeholder — do NOT use for authorization.
// Phase 6 will derive userId from ctx.auth.getUserIdentity()
```

---

## Step 8: Correctness — Fix Fragile Tool Indexing

**File:** `src/app/api/generate/route.ts` (line 148)

**What to do:** Replace `tools[1]` with named extraction:

```ts
// In createAgentTools, export tools as named object instead of array:
// Return: { setAppName, writeFile, readFile, listFiles, all: [setAppName, writeFile, readFile, listFiles] }
```

Simpler approach — in `agent-tools.ts`, change return to a named object:
```ts
const toolSet = { setAppName, writeFile, readFile, listFiles };
return { ...toolSet, all: [setAppName, writeFile, readFile, listFiles] };
```

Then in `route.ts`:
```ts
const toolSet = isFlashcardMode ? ... : createAgentTools({...});
const tools = isFlashcardMode ? createFlashcardTools({...}) : toolSet.all;
// ...
const reviewTools = [toolSet.writeFile]; // explicit, not index-based
```

**Alternative (simpler, less invasive):** Since `createAgentTools` returns `[setAppName, writeFile, readFile, listFiles]`, just add a named export:

In `agent-tools.ts`, add after the return:
```ts
// Export individual tools by name for callers that need specific ones
export { writeFile as writeFileTool }; // No — this doesn't work with closures
```

**Simplest fix:** Just use `.find()` by tool name:
```ts
const reviewTools = tools.filter(t => t.name === "write_file");
```

This is robust against reordering.

---

## Step 9: Correctness — SSE Type Mismatch

**File:** `src/features/builder/lib/sse-events.ts` (line 8)

**What to do:** Change `contents: string` to `contents?: string` since the server only sends `{ path }`:

```ts
| { event: "file_complete"; path: string; contents?: string }
```

---

## Step 10: Performance — Batch Flashcard Creation

**File:** `src/features/flashcards/lib/flashcard-tools.ts`

**What to do:** Replace `Promise.allSettled(cardPromises)` with `settleInBatches` (already imported in `route.ts`, available in `src/core/utils.ts`):

```ts
import { settleInBatches } from "@/core/utils";
// ...
const cardThunks = cards.map((card, i) => () => createSingleCard(card, i, ...));
const results = await settleInBatches(cardThunks, 3); // 3 cards at a time
```

---

## Step 11: Performance — Async cpSync

**File:** `src/app/api/generate/route.ts` (line 114)

**What to do:** Replace synchronous `cpSync` with async `fs.cp`:

```ts
import { cp } from "fs/promises";
// ...
buildDir = mkdtempSync(join(tmpdir(), "bridges-build-"));
await cp(join(process.cwd(), "artifacts/wab-scaffold"), buildDir, { recursive: true });
```

Note: `mkdtempSync` is fine (fast, no I/O wait). Only `cpSync` is the bottleneck.

---

## Step 12: Performance — Add .take() to Unbounded Queries

**Files:**
- `convex/flashcard_cards.ts:46` — `listByDeck`: add `.take(200)`
- `convex/flashcard_cards.ts:57-59` — `deleteByDeck`: add `.take(500)`
- `convex/flashcard_decks.ts` — `listBySession`: add `.take(100)` if unbounded
- `convex/templates/queries.ts` — both branches: add `.take(100)`

---

## Step 13: Performance — Skip getMostRecent When Session Loaded

**File:** `src/features/builder/components/builder-page.tsx` (line 78)

**What to do:**
```ts
const mostRecent = useQuery(
  api.sessions.getMostRecent,
  sessionIdFromUrl ? "skip" : {}
);
```

---

## Step 14: Quality — Delete Dead sse-types.ts

**File:** `src/features/builder/lib/sse-types.ts`

**What to do:** Delete this file entirely. Zero imports exist.

---

## Step 15: Quality — Extract Shared SSE Parser

**What to do:**

1. `use-flashcard-streaming.ts` already imports `parseSSEEvent` from `sse-events.ts` (line 5)
2. The duplicated `parseSSEChunks` function (lines 18-42) handles raw SSE text splitting (buffer → chunks → events). This is the part that's duplicated.
3. Move `parseSSEChunks` to `src/core/sse-utils.ts` (new file):
   ```ts
   export function parseSSEChunks(text: string): Array<{ event: string; data: unknown }> { ... }
   ```
4. Import from both `use-streaming.ts` and `use-flashcard-streaming.ts`
5. Check if `use-streaming.ts` has its own version — if so, replace both.

---

## Step 16: Quality — Fix VSA Boundary Violations

**What to do:**

1. Move `src/features/builder/components/delete-confirmation-dialog.tsx` → `src/shared/components/delete-confirmation-dialog.tsx`
2. Update import in `src/features/dashboard/components/dashboard-view.tsx`:
   ```ts
   import { DeleteConfirmationDialog } from "@/shared/components/delete-confirmation-dialog";
   ```
3. Update import in any builder files that use it.

4. Move `parseSSEEvent` and `SSEEvent` type from `src/features/builder/lib/sse-events.ts` → `src/core/sse-events.ts` (since flashcards also uses it). Update all imports.

---

## Step 17: Quality — Deduplicate THERAPY_SUGGESTIONS

**Files:**
- `src/features/builder/components/builder-page.tsx` (lines 29-34)
- `src/features/builder/components/chat-panel.tsx` (lines 21-26)

**What to do:** Extract to `src/features/builder/lib/constants.ts`:
```ts
export const THERAPY_SUGGESTIONS = ["Token Board", "Visual Schedule", "Communication Board", "Social Story"];
```
Import in both files.

---

## Step 18: Quality — Merge Duplicate SuggestionChips

**What to do:**

1. Keep `src/features/builder/components/suggestion-chips.tsx` (the generic version that accepts `suggestions` prop)
2. Move to `src/shared/components/suggestion-chips.tsx`
3. Update flashcards to import the shared version and pass suggestions as props
4. Delete `src/features/flashcards/components/suggestion-chips.tsx`

---

## Step 19: Quality — Fix import type for Id

**Files:** `src/features/builder/components/chat-panel.tsx`, `src/features/builder/hooks/use-session.ts`

**What to do:** Change `import { Id }` to `import type { Id }`.

---

## Step 20: Correctness — Guard Empty Deck Navigation

**File:** `src/features/flashcards/hooks/use-deck-navigation.ts`

**What to do:** Add early return when `totalCards === 0`:
```ts
const goTo = useCallback((index: number) => {
  if (totalCards === 0) return;
  setCurrentIndex(Math.max(0, Math.min(index, totalCards - 1)));
}, [totalCards]);
```
Same for `goNext` and `goPrev`.

---

## Step 21: Quality — Fix misleading image_cache count

**File:** `convex/image_cache.ts`

**What to do:** Rename `count` → `hasAny` and return boolean:
```ts
export const hasAny = query({
  handler: async (ctx) => {
    const entry = await ctx.db.query("imageCache").first();
    return !!entry;
  },
});
```
Update callers (seed guards).

---

## Step 22: Quality — Remove Unused Dependencies

**File:** `package.json`

**What to do:** Grep for `@fal-ai` and `@webcontainer/api` in src/ and convex/. If zero imports, remove both from `dependencies`.

---

## Step 23: UX — Fix Mobile Menu DialogTitle

**What to do:** Find the mobile navigation sheet/dialog component and add a `<DialogTitle>` (can be visually hidden):
```tsx
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
// or
<DialogTitle className="sr-only">Navigation Menu</DialogTitle>
```

---

## Step 24: Correctness — Separate setLive from Message Persistence

**File:** `src/app/api/generate/route.ts` (lines 250-251)

**What to do:** Use `Promise.allSettled` for message writes, then always call `setLive`:
```ts
// Persist messages (non-blocking — failures don't prevent going live)
await Promise.allSettled(postLlmPromises);
// Always transition to live
await convex.mutation(api.sessions.setLive, { sessionId });
```

---

## Step 25: Quality — Template Files Fix for Publish

**File:** `src/features/builder/lib/template-files.ts`

**What to do:** Instead of hardcoding all WAB scaffold files in this module, read them from disk at build time. Since this runs server-side only (called from Convex action), read the scaffold directory:

```ts
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

function readScaffoldTree(dir: string, base: string): FlatFile[] {
  const result: FlatFile[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(base, fullPath);
    if (entry.isDirectory()) {
      // Skip node_modules and dist
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      result.push(...readScaffoldTree(fullPath, base));
    } else {
      if (relPath === "src/App.tsx") continue; // skip placeholder
      result.push({ file: relPath, data: readFileSync(fullPath, "utf-8") });
    }
  }
  return result;
}

const SCAFFOLD_DIR = join(process.cwd(), "artifacts/wab-scaffold");

export function getPublishableTemplateFiles(): FlatFile[] {
  return readScaffoldTree(SCAFFOLD_DIR, SCAFFOLD_DIR);
}
```

**Note:** Verify this function is called from a server-side context (Convex action or API route) — never from client code.

---

## Execution Order

Group by risk and dependency:

**Group A — Critical security (do first):**
1. Step 1 (iframe CSP)
2. Step 2 (rate limiting)
3. Step 3 (read_file path guard)

**Group B — Other security:**
4. Step 4 (voiceId restriction)
5. Step 5 (STT size limit)
6. Step 6 (security headers)
7. Step 7 (userId comment)

**Group C — Correctness:**
8. Step 8 (tool indexing)
9. Step 9 (SSE type fix)
10. Step 20 (empty deck guard)
11. Step 24 (setLive separation)

**Group D — Performance:**
12. Step 10 (batch flashcards)
13. Step 11 (async cpSync)
14. Step 12 (add .take() bounds)
15. Step 13 (skip getMostRecent)

**Group E — Quality & cleanup:**
16. Step 14 (delete dead file)
17. Step 15 (extract SSE parser)
18. Step 16 (fix VSA violations)
19. Step 17 (dedup suggestions)
20. Step 18 (merge suggestion chips)
21. Step 19 (import type)
22. Step 21 (image_cache rename)
23. Step 22 (remove unused deps)
24. Step 23 (DialogTitle fix)
25. Step 25 (template-files fix)

---

## Verification

After all fixes:

1. **Tests:** `pnpm vitest --run` — all 627+ tests must pass
2. **Convex deploy:** `npx convex dev` — verify rate limiter component registers
3. **Build:** `pnpm build` — no TypeScript errors
4. **Manual E2E:**
   - Open builder, generate an app → verify CSP meta tag in iframe source
   - Verify rate limiting: rapidly POST to /api/generate → expect 429 after 5 requests
   - Test flashcard generation with 10+ cards → verify batched (not all parallel)
   - Check mobile menu → no console DialogTitle warning
   - Test publish flow → verify template files included
5. **Security spot-check:**
   - Inspect iframe `<meta>` CSP tag in DevTools
   - Attempt `read_file` with `../../etc/passwd` in AI prompt → should be blocked
   - Send oversized base64 to STT endpoint → should get size error
