# E2E Issue Fix Plan

## Context

E2E testing of the Bridges builder and flashcard journeys revealed 15 issues across security, UX, and reliability. The most critical: the builder preview panel is blank because Parcel build failures are silently swallowed, and multiple Convex queries lack authorization checks. This plan addresses all issues found, grouped into 4 implementation phases ordered by severity and dependency.

---

## Phase 1: Fix Builder Preview Pipeline (CRITICAL)

The core value proposition — "see your generated app" — is broken. Files generate successfully but the preview iframe shows blank.

### 1A. Surface Parcel build errors instead of swallowing them

**File:** `src/app/api/generate/route.ts` (lines 219-223)

**Problem:** The catch block logs to server console only, never sends an error SSE event. `buildSucceeded` stays `false` but the pipeline continues to `setLive` + `send("done")`.

**Fix:**
- In the catch block (line 219), send a `"build_error"` activity with the actual error message
- Track `buildSucceeded` explicitly and use it in the done event
- When `!buildSucceeded && collectedFiles.size > 0`, transition session to `"live"` but include `buildFailed: true` in the done event (already partially done on line 284, but the frontend doesn't use it)

```
catch (buildError) {
  const msg = buildError instanceof Error ? buildError.message : String(buildError);
  console.error("[generate] Parcel build failed:", msg);
  send("activity", { type: "complete", message: `Build failed: ${msg.slice(0, 200)}` });
  // buildSucceeded remains false — done event will include buildFailed: true
}
```

### 1B. Handle `buildFailed` on the frontend

**File:** `src/features/builder/hooks/use-streaming.ts` (line 187-196)

**Problem:** The `done` event handler sets `status = "live"` unconditionally, ignoring `buildFailed`.

**Fix:**
- In the `"done"` case, check `sseEvent.buildFailed`
- If build failed, set a new state like `"live"` but also set `buildFailed` state so PreviewPanel can show an actionable error instead of a blank panel
- Add `buildFailed` boolean to the streaming hook return value

```typescript
case "done":
  // ... existing flush logic ...
  setStatus("live");
  setBuildFailed(sseEvent.buildFailed ?? false);
  if (sseEvent.sessionId) setSessionId(sseEvent.sessionId);
  break;
```

### 1C. Update PreviewPanel to show actionable build error

**File:** `src/features/builder/components/preview-panel.tsx` (lines 92-98)

**Problem:** Shows generic "Build could not produce a preview" with no information about what went wrong.

**Fix:**
- Accept `buildFailed` prop
- When `buildFailed && state === "live"`, show the build error message and a "Retry Build" button
- The retry button should re-trigger bundling via a new API call or prompt the user to request changes

### 1D. Fix contradictory "App is ready!" message

**File:** `src/app/api/generate/route.ts` (line 282)

**Problem:** Sends "App is ready!" even when build failed.

**Fix:**
```typescript
send("activity", {
  type: "complete",
  message: buildSucceeded ? "App is ready!" : "Code generated — build had issues"
});
```

### 1E. Entry point alignment (VERIFIED — no change needed)

The WAB scaffold chain is: `index.html` → `src/main.tsx` → `import App from './App.tsx'`. The `main.tsx` file is pre-existing in the scaffold. The agent prompt already has 5 explicit references requiring `src/App.tsx`. Parcel failures are likely from **TypeScript errors in generated code**, not missing entry points. The fix in 1A (surfacing the actual error message) will make these diagnosable.

---

## Phase 2: Add Authorization to Convex Queries (CRITICAL — Security)

Multiple Convex functions allow any authenticated user to read/write any session's data by guessing IDs.

### 2A. Add auth to `convex/generated_files.ts` — ALL 4 functions

**Lines:** 6-88 (upsert, upsertAutoVersion, list, getByPath)

**Fix:** Add `assertSessionOwner(ctx, args.sessionId)` at the top of each handler. For the two mutations this is a hard check (throws). For the two queries, use soft check that returns empty/null.

**Note:** The API route (`route.ts`) calls these mutations server-side with `ConvexHttpClient`. It authenticates via `convex.setAuth(token)` on line 60, so `assertSessionOwner` will work correctly — the Clerk JWT identity matches the session's `userId`.

### 2B. Add auth to `convex/flashcard_cards.ts` — ALL 3 functions

**Lines:** 5-78 (create, listByDeck, deleteByDeck)

**Fix:** Look up the deck, verify `deck.userId === identity.subject`. For `create` and `deleteByDeck` (mutations), throw on failure. For `listByDeck` (query), return empty array.

### 2C. Fix `convex/sessions.ts:listByState` — inefficient filter

**Line:** 82-94

**Problem:** Fetches ALL sessions matching a state, then filters by userId in JS. Data leaks through the intermediate query even though the function returns correctly.

**Fix:** Add a compound index `by_state_user` on `["state", "userId"]` to the schema, then use `.withIndex("by_state_user", q => q.eq("state", args.state).eq("userId", userId))`.

**Schema change:** `convex/schema.ts` — add `.index("by_state_user", ["state", "userId"])` to the sessions table.

### 2D. Document `apps.getByShareSlug` as intentionally public

**Line:** `convex/apps.ts:45-53`

This is intentionally public for the sharing feature. Add a comment documenting this.

---

## Phase 3: Fix Builder UX Issues (HIGH)

### 3A. Fix template → builder "Untitled App" + prompt lost on HMR

**File:** `src/features/builder/components/builder-page.tsx` (lines 137-145)

**Problem:** `replaceState` strips `?prompt=` BEFORE generation starts. HMR reload loses the prompt.

**Fix:**
1. Move `window.history.replaceState` into the streaming hook's `handleEvent` for the `"session"` event — only strip the prompt from URL after the session is confirmed created
2. OR: Store the submitted prompt in `sessionStorage` as a backup, clear it on successful generation start

Simpler fix:
```typescript
useEffect(() => {
  if (promptFromUrl && status === "idle" && !promptSubmitted.current && !sessionIdFromUrl) {
    promptSubmitted.current = true;
    handleGenerate(decodeURIComponent(promptFromUrl));
    // Don't clear URL here — clear it when sessionId arrives (line 165-172)
  }
}, [promptFromUrl, status, handleGenerate, sessionIdFromUrl]);
```

Then in the URL update effect (line 165-172), also clear the prompt param:
```typescript
useEffect(() => {
  if (sessionId) {
    localStorage.setItem("bridges_last_session", sessionId);
    window.history.replaceState(null, '', `?sessionId=${sessionId}`);
    // This naturally strips ?prompt= when sessionId is set
  }
}, [sessionId, sessionIdFromUrl]);
```

### 3B. Fix sessionIdRef stale in concurrent generate() calls

**File:** `src/features/builder/hooks/use-streaming.ts` (line 236)

**Problem:** `sessionIdRef.current` may be stale during concurrent calls.

**Fix:** Pass `sessionId` as a parameter to `generate()` instead of reading from ref:

```typescript
const generate = useCallback(
  async (prompt: string, existingSessionId?: string): Promise<void> => {
    // ...
    body: JSON.stringify({
      prompt,
      sessionId: existingSessionId ?? sessionIdRef.current ?? undefined,
    }),
```

Update callers to pass the current sessionId explicitly.

### 3C. Fix flashcard chat panel not syncing on deck switch

**File:** `src/features/flashcards/components/flashcard-page.tsx`

**Problem:** `activeDeckId` isn't passed to chat panel or generate function.

**Fix:**
1. Pass `activeDeckId` as prop to `FlashcardChatPanel`
2. Include `activeDeckId` in the `handleSubmit` callback → pass to `generate()`
3. Update `use-flashcard-streaming.ts` to accept `deckId` parameter
4. Update `/api/generate` route to accept and use `deckId` for flashcard mode

### 3D. Fix `buildDir` undefined in flashcard mode

**File:** `src/app/api/generate/route.ts` (line 139)

**Problem:** `buildDir!` non-null assertion is incorrect — `buildDir` is only set for builder mode.

**Fix:** Guard the Parcel bundling block with `if (buildDir && collectedFiles.size > 0)` instead of just `if (collectedFiles.size > 0)`. Flashcard mode doesn't need Parcel bundling.

---

## Phase 4: Fix Data Integrity & Minor Issues (MEDIUM/LOW)

### 4A. Fix SSE parser null coercion

**File:** `src/core/sse-events.ts` (lines 34, 46)

**Problem:** `String(d.contents ?? "")` converts null to empty string. `String(d.html ?? "")` same.

**Fix:** For `file_complete`, keep `contents` as optional:
```typescript
case "file_complete":
  return { event: "file_complete", path: String(d.path ?? ""), contents: d.contents != null ? String(d.contents) : undefined };
```
For `bundle`, keep as-is since empty html is still a valid signal of failure (caught downstream).

Update the `SSEEvent` type to make `contents` optional on `file_complete` (it already is on line 8).

### 4B. Add missing Convex argument validators

**File:** `convex/messages.ts` — add bounds on `timestamp` (positive number, not in future)
**File:** `convex/generated_files.ts` — add path length limit and format validation

```typescript
// messages.ts
timestamp: v.number(),  // Add runtime check: if (args.timestamp < 0 || args.timestamp > Date.now() + 60000) throw

// generated_files.ts
path: v.string(),  // Add runtime check: if (args.path.length > 500 || args.path.includes("..")) throw
```

### 4C. Mobile panel state persistence (LOW)

**File:** `src/features/builder/components/builder-page.tsx`

Store `mobilePanel` state in URL search params or sessionStorage so it persists on navigation. Low priority — UX convenience only.

---

## Files to Modify (Summary)

| File | Phase | Changes |
|------|-------|---------|
| `src/app/api/generate/route.ts` | 1A, 1D, 3D | Surface build errors, fix message, guard buildDir |
| `src/features/builder/hooks/use-streaming.ts` | 1B, 3B | Handle buildFailed, fix stale sessionIdRef |
| `src/features/builder/components/preview-panel.tsx` | 1C | Show actionable build error |
| `src/features/builder/components/builder-page.tsx` | 3A, 4C | Fix prompt URL clearing, mobile state |
| `src/features/builder/lib/agent-prompt.ts` | 1E | Verify entry point directive |
| `convex/generated_files.ts` | 2A, 4B | Add auth checks + path validation |
| `convex/flashcard_cards.ts` | 2B | Add deck ownership checks |
| `convex/sessions.ts` | 2C | Fix listByState with compound index |
| `convex/schema.ts` | 2C | Add `by_state_user` index |
| `convex/apps.ts` | 2D | Document public query |
| `src/core/sse-events.ts` | 4A | Fix null coercion |
| `src/features/flashcards/components/flashcard-page.tsx` | 3C | Pass activeDeckId to chat/generate |
| `src/features/flashcards/hooks/use-flashcard-streaming.ts` | 3C | Accept deckId parameter |
| `convex/messages.ts` | 4B | Add timestamp bounds |

---

## Verification Plan

### After Phase 1 (Preview Pipeline):
1. Run `npm test` — ensure existing tests pass
2. Start dev server (`npm run dev`)
3. Create a new builder session with a token board prompt
4. Verify: if Parcel build fails, user sees an actionable error message (not blank)
5. Verify: if Parcel build succeeds, preview renders correctly
6. Verify: reload the page with `?sessionId=` — preview should load from persisted `_bundle.html`
7. Check browser console for the "buildFailed" flag in the done event

### After Phase 2 (Auth):
1. Run `npm test` — Convex tests should pass
2. Manually test: try accessing a session file via Convex dashboard with wrong userId — should fail
3. Verify: normal user flow still works (create session, generate files, view files)

### After Phase 3 (UX):
1. Test template click → verify session title matches template name
2. Test concurrent generate calls → verify no orphaned sessions
3. Test flashcard deck switching → verify chat context updates
4. Run full E2E test suite: `npx playwright test`

### After Phase 4 (Data Integrity):
1. Run `npm test` — full suite
2. Verify SSE parsing handles null values correctly
3. Verify Convex argument validation rejects bad inputs
