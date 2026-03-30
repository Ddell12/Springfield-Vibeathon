# Plan: Session Persistence Refactor — Path-Based URLs + Explicit Resume

## Context

Session persistence is clunky: navigating between pages causes a random old session to appear because `builder-page.tsx` silently auto-resumes the most recent LIVE session via `window.history.replaceState`. This is the opposite of how every major builder app (Figma, Bolt, Replit, Notion) handles it — they all let users **choose** to resume. Additionally, sessions use fragile query params (`?sessionId=`) instead of path-based URLs, and there are three competing state sources (URL, localStorage, Convex `getMostRecent`).

**Goal:** URL is the single source of truth. `/builder` = new session. `/builder/{id}` = resume. No auto-resume magic.

### Verified Best Practices (Sources)

- **Next.js 16 dynamic routes**: `params` is a `Promise` — unwrap with `use()` in client components ([Next.js Docs: Dynamic Routes](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes))
- **`useSearchParams` requires Suspense**: Without a `<Suspense>` boundary, it opts the entire page into CSR. Wrap the smallest subtree that calls it ([Next.js Docs: useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params), [Missing Suspense boundary](https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout))
- **`router.replace` for URL updates without history**: Correct for session-creation transitions where back button shouldn't return to empty prompt ([Next.js Docs: useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router))
- **Convex `"skip"` pattern**: Confirmed approach for conditional queries ([Convex Docs: React Client](https://docs.convex.dev/client/react))
- **Convex `.withIndex` over `.filter`/scan**: Index-based queries are more efficient than scanning + filtering in code ([Convex Docs: Best Practices](https://docs.convex.dev/understanding/best-practices))

---

## Phase 1: Create Dynamic Route

### 1.1 New file: `src/app/(app)/builder/[sessionId]/page.tsx`

Uses `use()` to unwrap the Promise-based params (Next.js 16 pattern). No `useSearchParams` here, so no Suspense needed.

```tsx
"use client";

import { use } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { BuilderPage } from "@/features/builder/components/builder-page";
import { Button } from "@/shared/components/ui/button";

function BuilderErrorFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-surface text-on-surface">
      <p className="text-lg font-semibold">Something went wrong</p>
      <Button variant="outline" onClick={resetErrorBoundary}>Try again</Button>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  return (
    <ErrorBoundary FallbackComponent={BuilderErrorFallback}>
      <BuilderPage initialSessionId={sessionId} />
    </ErrorBoundary>
  );
}
```

### 1.2 Update: `src/app/(app)/builder/page.tsx`

Pass `initialSessionId={null}` to `<BuilderPage>`. **Critical: wrap in `<Suspense>`** because `BuilderPage` calls `useSearchParams()` for the `?prompt=` param. Without Suspense, Next.js opts the entire route into client-side rendering during static builds.

```tsx
"use client";

import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { BuilderPage } from "@/features/builder/components/builder-page";
import { Button } from "@/shared/components/ui/button";

function BuilderErrorFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-surface text-on-surface">
      <p className="text-lg font-semibold">Something went wrong</p>
      <Button variant="outline" onClick={resetErrorBoundary}>Try again</Button>
    </div>
  );
}

export default function Page() {
  return (
    <ErrorBoundary FallbackComponent={BuilderErrorFallback}>
      <Suspense fallback={null}>
        <BuilderPage initialSessionId={null} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## Phase 2: Refactor BuilderPage (Core Change)

**File:** `src/features/builder/components/builder-page.tsx` (417 lines)

### 2.1 New props interface

```tsx
interface BuilderPageProps {
  initialSessionId: string | null;
}
export function BuilderPage({ initialSessionId }: BuilderPageProps) {
```

### 2.2 Replace `useSearchParams` usage

- Keep `useSearchParams` only for `?prompt=` on the base `/builder` route. The Suspense boundary in Phase 1.2 ensures this doesn't trigger full CSR bailout.
- When `initialSessionId` is non-null (i.e., on `/builder/[sessionId]`), `useSearchParams` is still called but `?prompt=` is ignored — this is safe because the `[sessionId]/page.tsx` doesn't wrap in Suspense (no search params are consumed).
- Replace every `sessionIdFromUrl` reference with `initialSessionId` prop
- Add `useRouter` from `next/navigation` for programmatic navigation (never from `next/router` — that's Pages Router, deprecated)

### 2.3 DELETE: Auto-resume effect (lines 168-183)

The entire `useEffect` that reads `mostRecent` and calls `replaceState`. This is the root cause of the bug.

### 2.4 DELETE: URL update effect (lines 185-193)

Replace with path-based navigation:
```tsx
useEffect(() => {
  if (sessionId && !initialSessionId) {
    router.replace(`/builder/${sessionId}`);
  }
}, [sessionId, initialSessionId, router]);
```
This fires only when SSE creates a new session mid-generation — a direct result of the user's action.

### 2.5 DELETE: Stale session cleanup (lines 195-201)

Replace with:
```tsx
useEffect(() => {
  if (initialSessionId && resumeSessionData === null && resumeFiles !== undefined) {
    router.replace("/builder");
  }
}, [initialSessionId, resumeSessionData, resumeFiles, router]);
```

### 2.6 DELETE: All localStorage usage

Remove lines 188, 198 — all reads/writes to `bridges_last_session`. URL is now the only state source.

### 2.7 DELETE: `autoResumed` ref (line 93)

No longer needed. Remove the ref and all references.

### 2.8 UPDATE: "New Chat" button (line 307-312)

Change from `window.location.href = "/builder?new=1"` to:
```tsx
onNewChat={() => {
  reset();
  sessionResumed.current = false;
  router.push("/builder");
}}
```
No `?new=1` needed — `/builder` is always a clean slate now.

### 2.9 UPDATE: `showPromptScreen` condition (line 241)

Change from:
```tsx
const showPromptScreen = !sessionId && status === "idle" && !sessionIdFromUrl;
```
to:
```tsx
const showPromptScreen = !sessionId && status === "idle" && !initialSessionId;
```

### 2.10 KEEP: `getMostRecent` query (line 92)

Keep it but use it for the "Continue" card instead of auto-resume:
```tsx
const mostRecent = useQuery(api.sessions.getMostRecent, initialSessionId ? "skip" : {});
```

---

## Phase 3: Add "Continue Where You Left Off" Card

### 3.1 New file: `src/features/builder/components/continue-card.tsx`

A small, dismissible card shown on the prompt screen when `mostRecent` is non-null:
- Shows session title and a "Continue" link to `/builder/{id}`
- Dismiss button hides it for the session (React state, not persisted)
- Appears below the suggestion chips
- Uses `Link` from `next/link` — no side effects, no auto-redirect

### 3.2 Render in BuilderPage prompt screen (after line 289)

```tsx
{mostRecent && !continueDismissed && (
  <ContinueCard
    sessionId={mostRecent._id}
    title={mostRecent.title}
    onDismiss={() => setContinueDismissed(true)}
  />
)}
```

---

## Phase 4: Update All Navigation Links

### 4.1 Session links → path-based (3 changes)

| File | Line | Old | New |
|------|------|-----|-----|
| `src/features/my-tools/components/my-tools-page.tsx` | 91 | `/builder?sessionId=${session._id}` | `/builder/${session._id}` |
| `src/features/dashboard/components/project-card.tsx` | 60 | `/builder?sessionId=${project.id}` | `/builder/${project.id}` |
| `src/features/dashboard/components/project-card.tsx` | 61 | `/builder?sessionId=${project.id}` | `/builder/${project.id}` |

### 4.2 No changes needed

- **15 plain `/builder` links** — already correct (landing, CTA, sidebar, my-tools empty state)
- **4 `/builder?prompt=...` links** — stay on base route, consumed before session creation
- **`src/shared/lib/navigation.ts`** — `isNavActive` already handles `/builder/*` sub-paths
- **Middleware** — existing matcher covers `/builder(.*)` including path segments

---

## Phase 5: Optimize `getMostRecent` Query

**File:** `convex/sessions.ts` lines 158-170

Replace the scan-100-then-filter approach with the existing `by_state_user` index (confirmed at `convex/schema.ts:21`):

```tsx
export const getMostRecent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_state_user", (q) =>
        q.eq("state", SESSION_STATES.LIVE).eq("userId", userId)
      )
      .order("desc")
      .take(1);
    return sessions[0] ?? null;
  },
});
```

---

## Phase 6: Update Tests

| Test File | Change |
|-----------|--------|
| `src/features/builder/components/__tests__/builder-page.test.tsx` | Pass `initialSessionId` prop, remove auto-resume tests, add `router.replace` assertion |
| `src/features/my-tools/components/__tests__/my-tools-page.test.tsx` | Expected href: `/builder/${id}` not `?sessionId=` |
| `src/features/dashboard/components/__tests__/project-card.test.tsx` | Expected push: `/builder/${id}` not `?sessionId=` |
| `src/shared/lib/__tests__/navigation.test.ts` | Already tests `/builder/session-123` — no change |

---

## Files Summary

| File | Action |
|------|--------|
| `src/app/(app)/builder/[sessionId]/page.tsx` | **CREATE** |
| `src/app/(app)/builder/page.tsx` | Modify (pass prop) |
| `src/features/builder/components/builder-page.tsx` | **Major refactor** (remove auto-resume, localStorage, replaceState; add prop + router.replace) |
| `src/features/builder/components/continue-card.tsx` | **CREATE** |
| `src/features/my-tools/components/my-tools-page.tsx` | Line 91: path-based URL |
| `src/features/dashboard/components/project-card.tsx` | Lines 60-61: path-based URL |
| `convex/sessions.ts` | Lines 158-170: optimize getMostRecent |
| 3 test files | Update expected URLs/props |

## Edge Cases

1. **Convex IDs are URL-safe** — they're alphanumeric + underscore, no encoding needed
2. **Back button after session creation** — `router.replace` means back goes to pre-builder page, not empty prompt (correct UX)
3. **Soft navigation on "New Chat"** — `reset()` already clears streaming state; if Convex queries don't reset cleanly, add `key={initialSessionId ?? "new"}` to force remount
4. **`?prompt=` on `[sessionId]` route** — not needed, only consumed on base `/builder`
5. **Suspense + useSearchParams** — `/builder/page.tsx` wraps `<BuilderPage>` in `<Suspense>` because `useSearchParams()` causes CSR bailout without it. The `[sessionId]/page.tsx` does NOT need Suspense since it doesn't consume search params. Even though `BuilderPage` still calls `useSearchParams()` internally, the `?prompt=` param is only acted on when `initialSessionId` is null (guarded by the effect condition at line 159).
6. **`router.replace` vs `window.location.href`** — Using `router.replace` for `/builder/{id}` is a soft navigation (no full reload). The `reset()` call in `useStreaming` already clears all React state. If any stale Convex subscriptions persist across soft navigations, the `initialSessionId` prop change will cause re-evaluation of all conditional `useQuery` calls via the `"skip"` pattern.

## Verification

1. `npm test` — run full Vitest suite (636 tests), verify all pass
2. Manual test flow:
   - Visit `/builder` → see clean prompt screen with suggestion chips
   - If recent session exists → see "Continue" card (not auto-redirected)
   - Submit prompt → URL changes to `/builder/{newId}` after SSE returns session
   - Navigate to `/my-tools` → click "Open" → goes to `/builder/{id}`
   - Click "New Chat" → goes to `/builder` (clean slate)
   - Refresh on `/builder/{id}` → session resumes correctly
   - Visit `/builder/{nonexistent}` → redirects to `/builder`
   - Template chips → `/builder?prompt=...` → generates, URL becomes `/builder/{id}`
3. `npx playwright test` — E2E tests pass
4. **Build check**: `npm run build` — verify no "Missing Suspense boundary with useSearchParams" error

## Sources

- [Next.js Docs: Dynamic Routes (v16)](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) — `params` as Promise, `use()` pattern
- [Next.js Docs: useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params) — Suspense boundary requirement
- [Next.js Docs: Missing Suspense boundary](https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout) — CSR bailout explanation
- [Next.js Docs: useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router) — `router.replace` vs `router.push`
- [Next.js Docs: useParams](https://nextjs.org/docs/app/api-reference/functions/use-params) — Alternative to `use(params)` for deep components
- [Convex Docs: React Client](https://docs.convex.dev/client/react) — `useQuery` skip pattern
- [Convex Docs: Best Practices](https://docs.convex.dev/understanding/best-practices) — Index-based queries over `.filter`/scan
- [Async params and searchParams in Next 16](https://dev.to/peterlidee/async-params-and-searchparams-in-next-16-5ge9) — Community guide
