# Fix E2E Testing Issues (Non-Auth)

## Context

E2E testing revealed 7 issues across the Bridges codebase. One bug (dashboard `?session=` vs `?sessionId=` param mismatch) was already fixed during testing. This plan addresses the remaining 6 non-auth issues: a responsive layout bug, a security issue, unbounded queries, leaked API errors, a missing return value, and a state/ref race condition.

Auth-related issues (missing `ctx.auth` checks, missing userId filters on list queries) are intentionally deferred to Phase 6 per project convention.

---

## Fix 1: Builder responsive layout at mobile/tablet
**Severity:** Medium | **File:** `src/features/builder/components/builder-page.tsx`

**Problem:** `ResizablePanelGroup orientation="horizontal"` is hardcoded. At `< 768px`, the chat and preview panels squeeze side-by-side, truncating all text.

**Fix:** Add a `useMediaQuery` hook (or `useEffect` + `matchMedia`) to detect viewport width, then conditionally show only one panel at a time on mobile instead of the resizable split. On mobile, show chat by default with a toggle to switch to preview.

**Changes:**
1. In `builder-page.tsx`: Add a `useIsMobile` check (reuse or create `src/core/hooks/use-mobile.ts` — check if one exists already in shadcn setup)
2. On mobile (`< 768px`): Replace `ResizablePanelGroup` with a single panel view controlled by `viewMode` state. Show chat OR preview, not both side-by-side
3. On mobile toolbar: Ensure Preview/Code toggle is always visible (currently `hidden lg:flex`)

**Key lines:** `builder-page.tsx:159-202` (panel group), `builder-toolbar.tsx` center section visibility

---

## Fix 2: Wildcard postMessage targetOrigin
**Severity:** Medium | **File:** `src/features/builder/hooks/use-postmessage-bridge.ts`

**Problem:** All 5 `postMessage(..., "*")` calls broadcast to any origin. While inbound messages are validated via `event.source`, outbound audio URLs and transcripts are exposed to any listening frame.

**Fix:** Replace `"*"` with the iframe's origin. Since WebContainer iframes use dynamic origins, extract it from `iframe.src` or use `new URL(iframe.src).origin`. Fall back to `"*"` only if `iframe.src` is empty/unavailable.

**Changes at lines 46, 52, 72, 78, 88:**
```typescript
const targetOrigin = iframe.src ? new URL(iframe.src).origin : "*";
iframe.contentWindow.postMessage({ ... }, targetOrigin);
```

Extract this into a helper at the top of the `handleMessage` callback to avoid repetition.

---

## Fix 3: Unbounded `.collect()` in therapy_templates queries
**Severity:** Medium | **File:** `convex/therapy_templates.ts`

**Problem:** `list()` and `getByCategory()` use `.collect()` without `.take()` limits. Currently only 8 templates exist, but this violates Convex best practices.

**Fix:**
- Line 11: Change `.collect()` to `.take(100)`
- Line 21: Change `.collect()` to `.take(100)`

100 is generous — there will never be 100 templates, but it provides a safety net.

---

## Fix 4: Raw API errors leaked to client
**Severity:** Medium | **Files:** `convex/aiActions.ts:61`, `convex/stt.ts:37`

**Problem:** `throw new Error(\`ElevenLabs API error: ${response.status} ${body}\`)` sends the raw API response body to the frontend. This may contain quota details, internal error objects, or large HTML responses.

**Fix:** Log the full error server-side with `console.error`, then throw a user-friendly message.

**aiActions.ts line 59-62:**
```typescript
if (!response.ok) {
  const body = await response.text().catch(() => "");
  console.error(`[TTS] ElevenLabs error ${response.status}:`, body);
  throw new Error("Speech generation failed. Please try again.");
}
```

**stt.ts line 35-38:**
```typescript
if (!response.ok) {
  const body = await response.text().catch(() => "");
  console.error(`[STT] ElevenLabs error ${response.status}:`, body);
  throw new Error("Speech recognition failed. Please try again.");
}
```

---

## Fix 5: Missing return value in `apps.update` mutation
**Severity:** Low | **File:** `convex/apps.ts:54-61`

**Problem:** The `update` mutation calls `ctx.db.patch()` but returns nothing. Callers cannot confirm the update or get the new state.

**Fix:** Return the `appId` after patching (consistent with Convex mutation patterns):
```typescript
await ctx.db.patch(appId, patch);
return appId;
```

---

## Fix 6: State/ref sync in `resumeSession`
**Severity:** Medium | **File:** `src/features/builder/hooks/use-streaming.ts:289-303`

**Problem:** `setSessionId()` (async state) and `sessionIdRef.current` (sync ref) are set in sequence. This is actually the **correct** pattern — the ref provides immediate access while state triggers re-renders. However, there's already a `useEffect` at line 94-96 that syncs `sessionIdRef` from `sessionId` state:

```typescript
useEffect(() => {
  sessionIdRef.current = sessionId;
}, [sessionId]);
```

The redundant manual ref set on line 292 is fine (it's a synchronous shortcut), but the real concern is that `resumeSession` should also update `appName` from the session data, and clear the WebContainer state if needed.

**Fix:** This is actually a false positive — the current code is correct. The ref is intentionally updated both manually (for immediate access) and via effect (as a safety net). No change needed.

**Revised: Skip this fix.** The pattern is intentional and correct.

---

## Execution Order

1. **Fix 3** — Bounded `.collect()` (1 line each, zero risk)
2. **Fix 4** — Sanitize API errors (2 files, straightforward)
3. **Fix 5** — Return appId from `apps.update` (1 line)
4. **Fix 2** — postMessage origin (5 replacements in 1 file)
5. **Fix 1** — Builder responsive layout (largest change, needs testing)

---

## Verification

1. **Fix 1:** Open builder at 375px and 768px viewports — chat should be readable, toggle between chat/preview
2. **Fix 2:** Verify `postMessage` calls use `new URL(iframe.src).origin` by reading the updated code
3. **Fix 3:** Run `npx convex typecheck` to verify `.take(100)` compiles
4. **Fix 4:** Grep for `ElevenLabs` in error throws — should find only generic messages
5. **Fix 5:** Check `apps.update` returns `appId`
6. **All:** Run `npx vitest run` to ensure no test regressions
