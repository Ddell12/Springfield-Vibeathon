# Fix: Caregiver /dashboard Hook Crash (#310)

## Context

Caregivers landing on `/dashboard` after sign-in triggered React error #310: "Rendered more hooks than during the previous render." Root cause: `/dashboard` was inside the `(app)` route group, so Next.js mounted the full `(app)/layout.tsx` (which includes `DashboardSidebar` and `AppHeader` — both heavy client components with many hooks) before the server redirect could fire. During the brief auth-settling window after sign-in, hook invocation counts differed between renders.

**Fix already implemented** in the previous session. This plan covers verification and commit.

## What Was Changed

| File | Change |
|------|--------|
| `src/app/dashboard/page.tsx` | **New** — server component, redirects caregivers → `/family`, SLPs → `/tools/new` |
| `src/app/(app)/dashboard/page.tsx` | **Deleted** — removed from (app) route group |

The new page uses only the root layout (no sidebar, no header, no hooks). The server redirect fires before any client components mount.

## Critical Files

- `src/app/dashboard/page.tsx` — the fix
- `src/app/(app)/layout.tsx` — confirms hook-heavy layout that caused the crash
- `convex/users.ts` — `currentUser` query returns `role` field (confirms `user?.role === "caregiver"` check is valid)
- `tests/e2e/caregiver.spec.ts` — existing E2E test at lines 182–189 specifically covers `/dashboard` → `/family` server redirect

## Verification Steps

1. **TypeScript check** — confirm no new errors:
   ```bash
   rm -rf .next/types && npx tsc --noEmit 2>&1 | grep -v "clerk/nextjs/server"
   ```
   Expected: zero output (the `@clerk/nextjs/server` error is a pre-existing Clerk remnant, not ours).

2. **Run caregiver E2E tests**:
   ```bash
   npx playwright test tests/e2e/caregiver.spec.ts --reporter=line
   ```
   Expected: all tests pass, including the `/dashboard` redirect test at line 182.

3. **Commit** the two file changes (`src/app/dashboard/page.tsx` added, `src/app/(app)/dashboard/page.tsx` deleted).

## Scope Boundary

No other files need touching. `DashboardSidebar`'s existing `useEffect` caregiver redirect (line ~31) remains as a belt-and-suspenders fallback — no need to remove it.
