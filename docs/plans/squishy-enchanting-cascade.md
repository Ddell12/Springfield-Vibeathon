# Follow-up Hardening: Auth Gap, Loading Skeleton, and Backfill Migration

## Context

Three non-blocking issues were flagged after the feature-boundaries/family-dashboard implementation landed on `main`:

1. **`listPublishedByPatient` has no auth check** — any caller who knows a `patientId` can enumerate all published apps for that patient. Every comparable query in the codebase (`listActiveSpeechCoachByPatient`, `listByPatient`, `getActiveByPatient`) calls `assertPatientAccess` before querying. This one was missed.

2. **No `loading.tsx` for `/family/[patientId]`** — `FamilyDashboard` calls `React.use(paramsPromise)`, which suspends until the Promise resolves. Without a `loading.tsx` at the route segment, there is no Suspense fallback; Next.js falls back to the parent `(app)/loading.tsx` (full-screen spinner) instead of a dashboard-shaped skeleton. A segment-specific `loading.tsx` gives a better perceived performance.

3. **`backfillTitleLower` migration needs to run** — `titleLower` was made optional in the schema for deploy safety. Existing `app_instances` documents (written before this field existed) don't have it, so server-side search falls back to `title.toLowerCase()` at query time. The one-shot migration patches all pre-existing docs.

---

## Task 1: Add `assertPatientAccess` to `listPublishedByPatient`

**File:** `convex/tools.ts` (line ~198)

**Change:** Add a single `await assertPatientAccess(ctx, args.patientId)` call before the DB query. `assertPatientAccess` is already defined in `convex/lib/auth.ts` and is already imported in `convex/homePrograms.ts` — add the same import to `convex/tools.ts`.

```ts
// convex/tools.ts
import { assertPatientAccess } from "./lib/auth";

export const listPublishedByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId); // ← ADD THIS
    const items = await ctx.db
      .query("app_instances")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .take(100);
    return items.filter((item) => item.status === "published" && item.shareToken);
  },
});
```

`assertPatientAccess` throws `ConvexError("Not authenticated")` if unauthenticated, and `ConvexError("Not authorized")` if the caller is neither the SLP owner nor an accepted caregiver. This matches the pattern used by all other patient-scoped queries.

**Test:** Add a unit test to `convex/__tests__/tools.test.ts`:
```ts
it("listPublishedByPatient throws when caller has no patient access", async () => {
  // create a patient owned by a different user, assert ConvexError is thrown
});
```

---

## Task 2: Add `loading.tsx` skeleton for `/family/[patientId]`

**File to create:** `src/app/(app)/family/[patientId]/loading.tsx`

Match the shape of the family dashboard layout using the existing `Skeleton` component (`src/shared/components/ui/skeleton.tsx`) and `animate-pulse`. Mirror the dashboard's sections: header, intake banner area, Kid Mode entry button, and card stack.

```tsx
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function FamilyDashboardLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto w-full">
      {/* Patient name header */}
      <Skeleton className="h-8 w-48" />
      {/* Intake banner */}
      <Skeleton className="h-14 rounded-xl" />
      {/* Kid Mode entry */}
      <Skeleton className="h-12 rounded-xl" />
      {/* Published tools / speech coach cards */}
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
    </div>
  );
}
```

**Why this works:** Next.js App Router automatically wraps each `page.tsx` in a `<Suspense>` boundary using the sibling `loading.tsx` as the fallback. When `FamilyDashboard` calls `React.use(paramsPromise)` and suspends, this skeleton renders instead of the full-screen spinner from `src/app/(app)/loading.tsx`.

**No test needed** — `loading.tsx` files are Next.js conventions, not tested directly.

---

## Task 3: Run the `backfillTitleLower` migration

This is a one-shot operational step, not a code change.

**After deploying Tasks 1 & 2**, run:
```bash
npx convex run migrations:backfillTitleLower
```

Expected output: `{ patched: N, total: M }` where `N` is the count of pre-existing documents that lacked `titleLower`.

The mutation is already implemented at `convex/migrations.ts`. It is idempotent — re-running it after full backfill returns `{ patched: 0, total: M }`.

---

## Critical Files

| File | Change |
|---|---|
| `convex/tools.ts` | Add `assertPatientAccess` call + import in `listPublishedByPatient` |
| `convex/__tests__/tools.test.ts` | Add auth guard test for `listPublishedByPatient` |
| `src/app/(app)/family/[patientId]/loading.tsx` | Create skeleton loading UI |
| `convex/migrations.ts` | Read-only — already implemented, just needs to be run |

## Reuse

- `assertPatientAccess` from `convex/lib/auth.ts` — already used in `homePrograms.ts`, `goals.ts`, `patientMessages.ts`
- `Skeleton` from `src/shared/components/ui/skeleton.tsx` — already used in `family-dashboard.tsx`, `tool-activity-summary.tsx`, `kid-mode-grid.tsx`

## Verification

1. **Auth test:** `npm test -- convex/__tests__/tools.test.ts` — all pass including new auth guard test
2. **Full suite:** `npm test` — 1359 pass, only 2 known pre-existing failures
3. **TypeScript:** `npx tsc --noEmit` — no new errors
4. **Migration:** After deploy, run `npx convex run migrations:backfillTitleLower` and confirm `patched > 0` (or 0 if already clean)
5. **Manual:** Visit `/family/[patientId]` with throttled network — confirm dashboard-shaped skeleton appears briefly instead of full-screen spinner
