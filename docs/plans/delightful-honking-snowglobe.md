# Fix: "Build could not produce a preview" in production

## Context

Users on the production Vercel deployment see "Build could not produce a preview" after generation completes. The generation finishes (state transitions to `"live"`), files are written, but `bundleHtml` is null and `buildFailed` is false — the bundle SSE event was silently lost.

### Root causes identified

1. **Silent SSE parse failure** — `src/core/sse-utils.ts:23` has an empty `catch {}` that swallows JSON parse errors. The `bundle` event is 200KB+ of JSON-encoded HTML. If it arrives malformed/truncated through Vercel's edge proxy, the event vanishes with zero logging.

2. **No fallback recovery** — The bundle IS persisted to Convex as `_bundle.html` (route.ts:196), but if the SSE event is lost, the client never tries to fetch it from Convex.

3. **Auth blocks legacy session files** — `assertSessionOwner({ soft: true })` returns null for unauthenticated users BEFORE checking if the session is a legacy (unowned) session. This means `generated_files.list` and `getByPath` return empty for unauth users, even on sessions that have no owner.

## Plan

### Step 1: Add diagnostic logging to SSE parser

**File:** `src/core/sse-utils.ts`

Replace the empty `catch {}` at line 23 with a `console.warn` that logs the event type, data length, and parse error. This is critical for diagnosing future issues in production browser DevTools.

### Step 2: Fix auth for legacy sessions

**File:** `convex/lib/auth.ts`

Restructure `assertSessionOwner` to fetch the session FIRST, then check ownership. If the session has no `userId` (legacy/demo session), return it regardless of caller auth. Only enforce auth when the session has an owner. This unblocks the Convex fallback query for unauthenticated demo users.

### Step 3: Add Convex fallback for lost bundle events

**File:** `src/features/builder/components/builder-page.tsx`

- Add `useQuery` import (alongside existing `useMutation`)
- Add a conditional `useQuery(api.generated_files.getByPath, ...)` that fires only when `status === "live" && !bundleHtml && !buildFailed && !!activeSessionId`
- Add an effect that calls `resumeSession()` with the recovered bundle when the query returns data
- Guard with a ref to prevent double-firing; reset guard when generation restarts

This is reactive — Convex queries auto-update when the persist mutation commits, so no polling needed.

### Step 4: Add retry button to preview panel

**File:** `src/features/builder/components/preview-panel.tsx`

- Add optional `onRetry?: () => void` prop
- Render a "Retry" button (using existing `RefreshCw` icon) inside the "Build could not produce a preview" block

**File:** `src/features/builder/components/builder-page.tsx`

- Pass `onRetry={handleRetry}` to both PreviewPanel instances (desktop line ~330, mobile line ~283)
- `handleRetry` already exists at line 88 — re-calls `generate` with the last prompt

## Files to modify

| File | Change |
|------|--------|
| `src/core/sse-utils.ts` | Add `console.warn` with event type + data length on parse failure |
| `convex/lib/auth.ts` | Fetch session before auth check; allow legacy sessions for all callers |
| `src/features/builder/components/builder-page.tsx` | Add `useQuery` fallback + `onRetry` prop wiring |
| `src/features/builder/components/preview-panel.tsx` | Add `onRetry` prop + retry button |

## Verification

1. **Unit tests:** Run `npm test` — existing tests should pass
2. **Manual test (dev):** Generate an app, verify preview shows. Open browser DevTools console — no SSE parse warnings should appear for successful builds
3. **Simulate failure:** In browser DevTools, add a breakpoint in `parseSSEChunks` to skip the bundle event push, verify the Convex fallback recovers the preview within seconds
4. **Session resume:** Navigate away from builder, return to `/builder/{id}` — preview should load from Convex
5. **Deploy to Vercel:** Verify the production issue is resolved
