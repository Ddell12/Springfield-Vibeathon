# Research: Best Practices for Convex + Next.js App Hardening

Research completed 2026-03-26. Each section includes findings from Convex/Next.js documentation (Context7), web search, and analysis of the current Bridges codebase.

---

## 1. Convex Authorization Patterns

### Current State in Bridges

The codebase already has a solid foundation in `convex/lib/auth.ts`:
- `getAuthUserId()` — extracts `identity.subject` from `ctx.auth.getUserIdentity()`
- `assertSessionOwner()` — verifies the caller owns a session, with `soft` mode for queries (returns null) and hard mode for mutations (throws)

**Gap:** Many public queries do NOT use these helpers. The following queries are exposed without auth checks:
- `convex/sessions.ts` — `get`, `list`, `listByState`, `getMostRecent`
- `convex/apps.ts` — `get`, `list`, `getBySession`, `getByShareSlug`
- `convex/generated_files.ts` — `list`, `getByPath`
- `convex/messages.ts` — `list`
- `convex/flashcard_decks.ts` — `get`, `list`, `listBySession`
- `convex/flashcard_cards.ts` — `listByDeck`
- `convex/therapy_templates.ts` — `list`, `getByCategory`, `get` (these may be intentionally public)
- `convex/app_state.ts` — `get`, `getAll`
- `convex/ai.ts` — `getTtsCache`

### Recommended Patterns (from Convex docs)

**Pattern A: Hard auth check (for mutations and private queries)**
```typescript
import { mutation } from "./_generated/server";

export const myMutation = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Unauthenticated call to mutation");
    }
    // proceed with identity.subject as userId
  },
});
```

**Pattern B: Soft auth check (for queries that return null/empty on failure)**
```typescript
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return []; // Return empty, don't throw
    return await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});
```

**Pattern C: Ownership scoping (filter results to current user)**
```typescript
export const getForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");
    return await ctx.db
      .query("messages")
      .withIndex("by_author", (q) => q.eq("author", identity.subject))
      .collect();
  },
});
```

### Best Practices (from Convex docs)

1. **Every public function needs access control.** Public functions can be called by anyone, including malicious attackers.
2. **Don't use spoofable identifiers** (like email) for access control. Use `identity.subject` or unguessable IDs.
3. **Favor granular functions** like `setTeamOwner` over `updateTeam` for finer-grained permission checks.
4. **Convex's three-tier architecture** means you check authorization in code at the beginning of each public function — no RLS needed.

### Recommended Approach for Bridges

- **Tier 1 (public, no auth):** `therapy_templates.list`, `therapy_templates.get`, `therapy_templates.getByCategory`, `apps.getByShareSlug` (for sharing)
- **Tier 2 (auth required, user-scoped):** `sessions.*`, `apps.list`, `generated_files.*`, `messages.*`, `flashcard_*` — use `getAuthUserId()` + ownership filter
- **Tier 3 (auth + ownership):** `sessions.get`, `apps.get`, `apps.getBySession` — use `assertSessionOwner()` with `soft: true`

---

## 2. SSE Streaming Error Handling in Next.js

### Current State in Bridges

The route at `src/app/api/generate/route.ts` already has a solid SSE implementation:
- Uses `ReadableStream` with `start(controller)` pattern (App Router compatible)
- Sends typed events via `sseEncode()` helper
- Has a top-level try/catch that sends `error` event on failure
- Sets session state to `failed` in Convex on error
- Client in `use-streaming.ts` handles the `error` event to set `status: "failed"`

**Gaps identified:**
1. **No partial-success state:** When Parcel build fails, the code sends an `activity` message but still transitions to `"live"` status. The `done` event includes `buildFailed` boolean, but the client ignores it.
2. **Error event lacks detail:** The generic "Generation failed" message loses the actual error cause.
3. **No mid-stream error recovery:** If the Anthropic stream dies mid-generation, the entire session fails.

### Recommended Patterns

**Pattern A: Structured error events with severity levels**
```typescript
// Server-side: differentiate fatal vs warning errors
send("error", {
  message: "Build failed — your code is saved but preview unavailable",
  severity: "warning",  // vs "fatal"
  code: "BUILD_FAILED",
  recoverable: true,
});
```

**Pattern B: "Failed with partial results" state**
```typescript
// In the done event, propagate build status explicitly
send("done", {
  sessionId,
  files: fileArray,
  buildFailed: !buildSucceeded && collectedFiles.size > 0,
  status: buildSucceeded ? "live" : "build_failed",
});

// Client-side: add a new status
type StreamingStatus = "idle" | "generating" | "live" | "build_failed" | "failed";
```

**Pattern C: Stream error with context (from Next.js docs)**

The Next.js docs note that once streaming has started (HTTP 200 sent), you cannot change the status code. This means error handling MUST happen within the SSE protocol:
```typescript
// Server: always use SSE error events, never rely on HTTP status for mid-stream errors
try {
  // ... streaming work
} catch (error) {
  send("error", {
    message: extractErrorMessage(error),
    phase: "generation",  // or "bundling", "persistence"
    partial: collectedFiles.size > 0,
  });
}
```

**Pattern D: Client-side error event handling with context**
```typescript
case "error":
  setError(sseEvent.message);
  // Don't set "failed" if we have partial results
  if (files.length > 0 && sseEvent.recoverable) {
    setStatus("build_failed"); // partial success
  } else {
    setStatus("failed");
  }
  break;
```

### Key Insight from Next.js Streaming Docs

When using `ReadableStream` in Route Handlers, the HTTP 200 status is sent with the first chunk. All subsequent errors must be communicated through the stream protocol itself (SSE events), not HTTP status codes. This is already correctly handled in Bridges.

---

## 3. Parcel Build Error Handling

### Current State in Bridges

The build step uses `execAsync` (shell command) rather than the Parcel programmatic API:
```typescript
await execAsync(
  "pnpm exec parcel build index.html --no-source-maps --dist-dir dist && node scripts/inline-bundle.cjs dist/index.html bundle.html",
  { cwd: buildDir, timeout: 30000 },
);
```

Errors are caught and logged but the actual diagnostic information (which file failed, why) is lost. The user sees "Build failed - check the Code panel."

### Parcel Programmatic API (from Parcel docs)

```javascript
import { Parcel } from '@parcel/core';

let bundler = new Parcel({
  entries: 'index.html',
  defaultConfig: '@parcel/config-default',
});

try {
  let { bundleGraph, buildTime } = await bundler.run();
  let bundles = bundleGraph.getBundles();
  console.log(`Built ${bundles.length} bundles in ${buildTime}ms!`);
} catch (err) {
  // err.diagnostics is an Array<Diagnostic> with structured error info
  console.log(err.diagnostics);
}
```

**Diagnostic objects include:**
- Error message
- File location (file, line, column)
- Code frame (snippet showing the error)
- Hints for correction

**Watch mode events:**
```typescript
// BuildFailureEvent
{
  type: 'buildFailure',
  diagnostics: Array<Diagnostic>
}
// BuildSuccessEvent
{
  type: 'buildSuccess',
  bundleGraph: BundleGraph<PackagedBundle>,
  buildTime: number,
}
```

### Recommended Approaches

**Option A: Keep CLI, parse stderr (minimal change)**
```typescript
try {
  await execAsync("pnpm exec parcel build ...", { cwd: buildDir, timeout: 30000 });
} catch (buildError: any) {
  // execAsync rejects with { stdout, stderr, code }
  const stderr = buildError.stderr || "";
  const friendlyMsg = parseBuildError(stderr); // Extract file/line from Parcel output
  send("error", {
    message: `Build error: ${friendlyMsg}`,
    severity: "warning",
    recoverable: true,
  });
}
```

**Option B: Switch to Parcel programmatic API (richer errors)**
```typescript
import { Parcel } from '@parcel/core';

const bundler = new Parcel({
  entries: join(buildDir, 'index.html'),
  defaultConfig: '@parcel/config-default',
  targets: { default: { distDir: join(buildDir, 'dist') } },
  shouldDisableCache: true,
});

try {
  const { bundleGraph, buildTime } = await bundler.run();
  // Success path...
} catch (err: any) {
  const diagnostics = err.diagnostics ?? [];
  const firstError = diagnostics[0];
  const errorDetail = firstError
    ? `${firstError.message} in ${firstError.origin}`
    : "Unknown build error";
  send("error", {
    message: `Build failed: ${errorDetail}`,
    severity: "warning",
    recoverable: true,
  });
}
```

**Option C: Fallback HTML wrapper when bundling fails**
```typescript
catch (buildError) {
  console.error("[generate] Parcel build failed:", buildError);
  // Generate a minimal fallback that loads the raw files
  const fallbackHtml = generateFallbackBundle(collectedFiles);
  send("bundle", { html: fallbackHtml, isFallback: true });
  send("activity", {
    type: "complete",
    message: "Preview is simplified — build had errors",
  });
}

function generateFallbackBundle(files: Map<string, string>): string {
  const appFile = files.get("src/App.tsx") ?? files.get("src/App.jsx") ?? "";
  // Minimal HTML that includes the raw source with a note
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"></script>
</head><body>
<div id="root"></div>
<script type="module">
  // Fallback: could not bundle. Showing error state.
  document.getElementById('root').innerHTML =
    '<div style="padding:2rem;font-family:sans-serif">' +
    '<h2>Build Preview Unavailable</h2>' +
    '<p>Your files were generated successfully but bundling failed. Check the Code panel.</p>' +
    '</div>';
</script></body></html>`;
}
```

### Recommendation for Bridges

**Option A (parse stderr) is the pragmatic choice.** The current CLI approach is fast and works. The main improvement is extracting the meaningful error from stderr and surfacing it to the user via SSE. Switching to the programmatic API (Option B) would give richer diagnostics but requires importing `@parcel/core` in the route handler and managing its Node.js API. Option C (fallback HTML) is a good addition regardless of which primary approach is used.

---

## 4. React useEffect Race Conditions

### Current State in Bridges

`builder-page.tsx` has **6 separate useEffects** that interact with shared state:

1. **Session resume** (lines 87-109): Fires when `sessionIdFromUrl + resumeSessionData + resumeFiles` are ready and `status === "idle"`
2. **Auto-submit from URL** (lines 139-145): Fires when `promptFromUrl` exists and `status === "idle"`
3. **Auto-resume most recent** (lines 150-162): Fires when no sessionId, no prompt, `mostRecent` exists, `status === "idle"`
4. **URL sync on session creation** (lines 165-172): Fires when `sessionId` changes
5. **Clear stale localStorage** (lines 175-181): Fires when session doesn't exist in Convex

These effects share guards on `status === "idle"` and use `useRef` flags (`sessionResumed`, `promptSubmitted`, `autoResumed`) to prevent double-firing. This is fragile — the order of effect execution matters, and HMR can reset state but not refs (or vice versa).

`use-streaming.ts` has **4 useEffects** that are simpler:
1. Sync `onFileCompleteRef` (line 86-88)
2. Sync `onBundleRef` (line 90-92)
3. Sync `sessionIdRef` (line 94-96)
4. Cleanup on unmount (line 321-330)

### Recommended Patterns

**Pattern A: Consolidate related effects into a single effect with a state machine**
```typescript
// Instead of 3 separate "what to do on idle" effects:
useEffect(() => {
  if (status !== "idle") return;

  // Priority 1: Resume from URL session
  if (sessionIdFromUrl && resumeSessionData && resumeFiles && !sessionResumed.current) {
    sessionResumed.current = true;
    resumeSession({ ... });
    return;
  }

  // Priority 2: Auto-submit prompt from URL
  if (promptFromUrl && !promptSubmitted.current && !sessionIdFromUrl) {
    promptSubmitted.current = true;
    handleGenerate(decodeURIComponent(promptFromUrl));
    window.history.replaceState(null, '', '/builder');
    return;
  }

  // Priority 3: Auto-resume most recent session
  if (!sessionIdFromUrl && !promptFromUrl && mostRecent && !autoResumed.current) {
    autoResumed.current = true;
    window.history.replaceState(null, '', `?sessionId=${mostRecent._id}`);
    return;
  }
}, [status, sessionIdFromUrl, resumeSessionData, resumeFiles,
    promptFromUrl, mostRecent, resumeSession, handleGenerate]);
```

This eliminates the race between three effects that all check `status === "idle"` and ensures a clear priority order.

**Pattern B: AbortController for SSE/fetch cleanup (already implemented)**

The `use-streaming.ts` hook already does this correctly:
```typescript
const controller = new AbortController();
abortRef.current = controller;
// ...
const response = await fetch("/api/generate", {
  signal: controller.signal,
});
// ...
// Cleanup:
useEffect(() => {
  return () => {
    abortRef.current?.abort();
  };
}, []);
```

This is the canonical pattern. The one improvement would be to also catch `AbortError` when reading the stream (already done at line 293).

**Pattern C: useReducer for related state transitions**
```typescript
type BuilderAction =
  | { type: "RESUME_SESSION"; payload: ResumeSessionArgs }
  | { type: "START_GENERATE"; prompt: string }
  | { type: "AUTO_RESUME"; sessionId: string }
  | { type: "CLEAR_STALE" };

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "RESUME_SESSION":
      return { ...state, phase: "resumed", sessionId: action.payload.sessionId };
    // ...
  }
}
```

This makes state transitions explicit and testable, and prevents impossible states.

**Pattern D: Ref synchronization effects are fine as-is**

The three "sync ref" effects in `use-streaming.ts` (lines 86-96) are the standard React pattern for keeping refs in sync with changing callback props. These are correct and don't need consolidation.

### Key Insight

The primary source of race conditions in `builder-page.tsx` is multiple effects competing to transition from `"idle"` state. The fix is to merge them into one effect with a clear priority waterfall. The `useRef` guards work but are fragile during HMR (see section 5).

---

## 5. Next.js HMR and State Preservation

### How Fast Refresh Works (from Next.js docs)

1. **`useState` and `useRef` values are preserved** between edits, as long as Hook call order doesn't change.
2. **`useEffect`, `useMemo`, `useCallback` always re-run** during Fast Refresh — their dependency arrays are ignored during HMR.
3. **State resets if** the file has non-component exports, the component is a class, or you add `// @refresh reset`.

### Implications for Bridges

**Problem 1: useRef guards + HMR = double execution**

When Fast Refresh fires:
- `useState` values are preserved (e.g., `status` stays `"idle"`)
- `useRef` values are preserved (e.g., `sessionResumed.current` stays `true`)
- BUT all `useEffect` callbacks re-run regardless of dependencies

This means:
- The ref guards (`sessionResumed.current`, `promptSubmitted.current`) correctly prevent double-firing after HMR because they persist.
- However, if you edit the component and the refs are stale from a previous run, effects might not fire when they should.

**Problem 2: Streaming connections during HMR**

If a developer edits `builder-page.tsx` while a stream is active:
- The `abortRef` in `use-streaming.ts` persists (useRef is preserved)
- The `generate` callback is re-created (useCallback dependencies change)
- The active `ReadableStream` reader continues in the background
- The cleanup effect in `use-streaming.ts` does NOT fire (component is not unmounting, just refreshing)

This means in-flight streams survive HMR correctly. This is actually the desired behavior.

**Problem 3: URL query params consumed once then stripped**

The pattern at lines 139-144:
```typescript
useEffect(() => {
  if (promptFromUrl && status === "idle" && !promptSubmitted.current && !sessionIdFromUrl) {
    promptSubmitted.current = true;
    handleGenerate(decodeURIComponent(promptFromUrl));
    window.history.replaceState(null, '', '/builder');
  }
}, [promptFromUrl, status, handleGenerate, sessionIdFromUrl]);
```

After HMR:
- `promptFromUrl` is now `null` (URL was already stripped)
- `promptSubmitted.current` is `true`
- Effect re-runs but both guards prevent re-firing

This is safe. The URL stripping via `replaceState` persists across HMR.

### Recommended Patterns

**Pattern A: Use `// @refresh reset` for streaming components (if needed)**

If you find that HMR causes stale stream state, add this to the top of the file:
```typescript
// @refresh reset
```
This forces a full remount on every edit. Use sparingly — only for components where state preservation causes bugs.

**Pattern B: Guard streaming connections with a stable identifier**
```typescript
const streamIdRef = useRef(0);

const generate = useCallback(async (prompt: string) => {
  const currentStreamId = ++streamIdRef.current;
  // ... start stream
  while (true) {
    const { done, value } = await reader.read();
    if (done || streamIdRef.current !== currentStreamId) break;
    // Only process events if this is still the active stream
  }
}, []);
```

**Pattern C: Dev-only streaming connection monitor**
```typescript
if (process.env.NODE_ENV === "development") {
  useEffect(() => {
    console.log("[HMR] Streaming hook re-mounted. Status:", status,
      "AbortRef:", !!abortRef.current);
  });
}
```

### Key Insight for Bridges

The current implementation is mostly HMR-safe because:
1. `useRef` values persist across Fast Refresh (guards work)
2. `AbortController` in `use-streaming.ts` persists (streams survive)
3. URL `replaceState` persists (consumed params stay consumed)

The main risk is during development when editing `builder-page.tsx` with the 6 separate useEffects. Consolidating the "idle" effects (Pattern from section 4) would also improve HMR resilience since there would be fewer effects racing against each other during re-execution.

---

## Summary of Recommended Actions

| Priority | Issue | Recommendation |
|----------|-------|----------------|
| **High** | Auth on public Convex queries | Add `getAuthUserId()` checks to all session/app/file queries; keep templates public |
| **High** | Parcel error surfacing | Parse stderr from CLI for user-friendly error messages; add fallback HTML bundle |
| **High** | useEffect race conditions | Consolidate 3 "idle" effects in builder-page.tsx into one prioritized effect |
| **Medium** | SSE partial-success state | Add `"build_failed"` status; propagate `buildFailed` from done event to client |
| **Medium** | SSE error detail | Include error phase and recoverable flag in error events |
| **Low** | HMR streaming safety | Current implementation is safe; add dev-only logging if debugging needed |
| **Low** | Parcel programmatic API | Consider migration for richer diagnostics, but CLI approach is adequate |

## Sources

- [Convex Auth Documentation](https://docs.convex.dev/auth/functions-auth)
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices)
- [Next.js Streaming Guide](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/streaming.mdx)
- [Next.js Route Handlers](https://github.com/vercel/next.js/blob/canary/docs/01-app/03-api-reference/03-file-conventions/route.mdx)
- [Parcel API Documentation](https://parceljs.org/features/parcel-api/)
- [Parcel Diagnostics and Logging](https://parceljs.org/plugin-system/logging/)
- [Next.js Fast Refresh Architecture](https://nextjs.org/docs/architecture/fast-refresh)
- [7 Common Next.js HMR Issues (LogRocket)](https://blog.logrocket.com/7-common-next-js-hmr-issues/)
- [Fixing Race Conditions in React with useEffect](https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect)
- [Race conditions in useEffect: Modern Patterns 2025](https://medium.com/@sureshdotariya/race-conditions-in-useeffect-with-async-modern-patterns-for-reactjs-2025-9efe12d727b0)
- [Using AbortController for Race Conditions in React](https://wanago.io/2022/04/11/abort-controller-race-conditions-react/)
- [React Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer)
- [React State Management in 2025](https://www.developerway.com/posts/react-state-management-2025)
- [MDN: Using Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [MDN: EventSource error event](https://developer.mozilla.org/en-US/docs/Web/API/EventSource/error_event)
