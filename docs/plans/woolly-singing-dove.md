# Fix: SSE Stream Killed by router.replace() During Generation

## Context

During browser testing of the builder and flashcard features, we discovered that submitting a prompt on `/builder` or `/flashcards` starts SSE generation but the page redirects away, killing the stream. The server logs "Controller is already closed" errors. This is a **pre-existing bug** — it blocks both the original builder flow and the new flashcard creator.

**Root cause:** `builder-page.tsx` calls `router.replace()` from Next.js App Router multiple times during active SSE streaming. `router.replace()` triggers component re-renders and can abort active `fetch` connections. Two rapid calls in succession reliably kill the SSE stream.

**Fix:** Replace `router.replace()` with `window.history.replaceState()` for all cosmetic URL updates. Per [Next.js docs](https://nextjs.org/docs/app/getting-started/linking-and-navigating), `window.history.replaceState` integrates with the Next.js Router (syncs with `usePathname`/`useSearchParams`) but does NOT trigger re-renders or interrupt fetch connections. Also harden the server-side `send()` function to gracefully handle closed connections.

---

## Changes

### 1. `src/features/builder/components/builder-page.tsx`

Replace all 4 `router.replace()` calls with `window.history.replaceState()`:

| Line | Current | Replacement | Context |
|------|---------|-------------|---------|
| 139 | `router.replace("/builder")` | `window.history.replaceState(null, '', '/builder')` | Cleans `?prompt=` after starting generation — **fires during active streaming** |
| 157 | `router.replace(`?sessionId=${mostRecent._id}`)` | `window.history.replaceState(null, '', `?sessionId=${mostRecent._id}`)` | Auto-resume redirect — safe but convert for consistency |
| 166 | `router.replace(`?sessionId=${sessionId}`)` | `window.history.replaceState(null, '', `?sessionId=${sessionId}`)` | Syncs URL with new sessionId — **fires during active streaming** |
| 176 | `router.replace("/builder")` | `window.history.replaceState(null, '', '/builder')` | Stale session cleanup — safe but convert for consistency |

After these changes, remove the unused `useRouter` import and `router` variable (lines 38, and the import from `next/navigation`). Keep `useSearchParams` — it's still needed.

**Why this is safe:** All 4 effects are guarded by `useRef` flags (`promptSubmitted`, `sessionResumed`, `autoResumed`) that prevent re-firing. `useSearchParams()` may return stale values after `replaceState`, but the ref guards ensure the effects only run once regardless.

### 2. `src/app/api/generate/route.ts`

Harden the `send()` function (line 81-83) to catch closed controller errors:

```typescript
const send = (eventType: string, data: object) => {
  try {
    controller.enqueue(encoder.encode(sseEncode(eventType, data)));
  } catch {
    // Client disconnected — normal for tab close, navigation away, etc.
  }
};
```

This is defensive — even after the client fix, users can always close tabs or navigate away mid-stream. The server should not log unhandled errors for normal disconnection scenarios.

---

## Files Modified

- `src/features/builder/components/builder-page.tsx` — 4 line changes + remove unused `useRouter`
- `src/app/api/generate/route.ts` — wrap `controller.enqueue` in try-catch

## Files NOT Modified

- `src/features/flashcards/components/flashcard-page.tsx` — does not use `router.replace()` during streaming, no fix needed
- `src/features/flashcards/hooks/use-flashcard-streaming.ts` — no URL management, no fix needed

---

## Verification

1. **Builder — prompt from URL:** Navigate to `/builder?prompt=Build%20a%20token%20board` → SSE should stream to completion, preview should render the app, no redirect
2. **Builder — direct prompt:** Type in the builder input and submit → same, no redirect
3. **Builder — dashboard chip:** Click "Communication Board" on dashboard → navigates to builder, SSE completes
4. **Builder — session resume:** Navigate to `/builder?sessionId=xxx` → resumes correctly
5. **Builder — auto-resume:** Navigate to `/builder` with no params → auto-resumes most recent session
6. **Builder — stale session:** Navigate to `/builder?sessionId=deleted_id` → redirects to clean `/builder`
7. **Flashcard — prompt:** Navigate to `/flashcards`, type prompt → SSE completes (requires Convex deployment for tools)
8. **Server logs:** Close tab mid-generation → no "Controller is already closed" errors
9. **Tests:** `npx vitest run` → all 627+ tests pass
