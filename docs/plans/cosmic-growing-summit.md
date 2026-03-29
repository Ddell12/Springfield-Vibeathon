# Fix E2E Testing Issues: Auth Race Condition & Builder Bundle Feedback

## Context

E2E testing on 2026-03-28 found two real bugs blocking core user journeys:

1. **Patient detail page crashes** — navigating to `/patients/[id]` throws `ConvexError: Not authenticated` because the Clerk JWT hasn't propagated to Convex when the query fires. This blocks the entire SLP workflow (patient detail, goals, session notes, reports).

2. **Builder generation appears hung** — new app generation shows "Almost there..." for 2+ minutes with no feedback. The bundle worker times out twice (60s each) while the client narration timer gets stuck on its last stage. The session DOES eventually transition to "live", but users abandon before then.

Two other suspected issues (patient row accessibility, filter pill truncation) were **false positives** — patient rows use semantic `<button>` elements, and filter pills scroll horizontally by design.

## Issue 1: Auth Race Condition Fix

### Root Cause

`patients.get`, `goals.get`, `sessionNotes.get`, and other queries use `assertSLP()` or manual auth checks that **throw** `ConvexError("Not authenticated")` when `ctx.auth.getUserIdentity()` returns null. Meanwhile, `patients.list` gracefully returns `[]`.

The components handle `undefined` (loading) and `null` (not found) but NOT thrown errors. When the page loads, the Convex WebSocket hasn't received the Clerk JWT yet, so the query throws immediately and crashes the error boundary.

### Fix Strategy

Use `useConvexAuth()` from `convex/react` + the `"skip"` pattern to suppress queries until Convex-side auth is ready. This pattern is already used in the codebase for nullable params. Keep backend throws as defense-in-depth.

**Key:** Use `useConvexAuth()` (NOT Clerk's `useAuth()`) because it reflects actual Convex WebSocket auth state, not just local token presence.

### Files to Modify

#### 1. `src/features/patients/hooks/use-patients.ts`

Add `useConvexAuth` import and gate all 6 hooks:

```typescript
import { useConvexAuth, useQuery } from "convex/react";

export function usePatients(status?: string) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.patients.list, isAuthenticated ? (status ? { status } : {}) : "skip");
}

export function usePatient(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.patients.get, isAuthenticated ? { patientId } : "skip");
}

export function usePatientStats() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.patients.getStats, isAuthenticated ? {} : "skip");
}

export function usePatientActivity(patientId: Id<"patients">, limit?: number) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.activityLog.listByPatient, isAuthenticated ? { patientId, limit } : "skip");
}

export function usePatientMaterials(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.patientMaterials.listByPatient, isAuthenticated ? { patientId } : "skip");
}

export function useCaregiverLinks(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.caregivers.listByPatient, isAuthenticated ? { patientId } : "skip");
}
```

#### 2. `src/features/goals/hooks/use-goals.ts`

Add `useConvexAuth` import. Gate all 4 query hooks (3 mutation hooks unchanged):

```typescript
import { useConvexAuth, useMutation, useQuery } from "convex/react";

// useGoals and useActiveGoals: add auth gate
export function useGoals(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.goals.list, isAuthenticated ? { patientId } : "skip");
}

export function useActiveGoals(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.goals.listActive, isAuthenticated ? { patientId } : "skip");
}

// useGoal and useGoalWithProgress: combine auth + null ID skip
export function useGoal(goalId: Id<"goals"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.goals.get, isAuthenticated && goalId ? { goalId } : "skip");
}

export function useGoalWithProgress(goalId: Id<"goals"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.goals.getWithProgress, isAuthenticated && goalId ? { goalId } : "skip");
}
```

#### 3. `src/features/session-notes/hooks/use-session-notes.ts`

Add `useConvexAuth` import. Gate both query hooks (6 mutation hooks unchanged):

```typescript
import { useConvexAuth, useMutation, useQuery } from "convex/react";

export function useSessionNotes(patientId: Id<"patients">, limit?: number) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.sessionNotes.list, isAuthenticated ? { patientId, limit } : "skip");
}

export function useSessionNote(sessionNoteId: Id<"sessionNotes"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.sessionNotes.get, isAuthenticated && sessionNoteId ? { noteId: sessionNoteId } : "skip");
}
```

#### 4. `src/features/goals/hooks/use-progress.ts`

Add `useConvexAuth` import. Gate both query hooks (1 mutation hook unchanged):

```typescript
import { useConvexAuth, useMutation, useQuery } from "convex/react";

export function useProgressByGoal(goalId: Id<"goals"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.progressData.listByGoal, isAuthenticated && goalId ? { goalId } : "skip");
}

export function useProgressByPatient(patientId: Id<"patients"> | null, periodStart: string, periodEnd: string) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.progressData.listByPatient, isAuthenticated && patientId ? { patientId, periodStart, periodEnd } : "skip");
}
```

#### 5. `src/features/goals/hooks/use-report-generation.ts`

Add `useConvexAuth` import. Gate both query hooks (3 mutation hooks and `useReportGeneration` unchanged):

```typescript
import { useConvexAuth, useMutation, useQuery } from "convex/react";

export function useReport(reportId: Id<"progressReports"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.progressReports.get, isAuthenticated && reportId ? { reportId } : "skip");
}

export function useReports(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.progressReports.list, isAuthenticated ? { patientId } : "skip");
}
```

### What NOT to Change

- **Backend queries** (`convex/patients.ts`, `convex/goals.ts`, etc.) — keep `assertSLP()` throws as defense-in-depth
- **Components** (`patient-detail-page.tsx`, `goal-detail.tsx`, etc.) — they already handle `undefined` as loading state; when hooks return `undefined` (due to `"skip"`), the components show their existing loading UI
- **Mutation hooks** — `useMutation` returns a callable function, doesn't fire automatically

---

## Issue 2: Builder Bundle Failure Feedback

### Root Cause

When `runBundleWorker()` fails, it retries once after 1 second. Each attempt has a 60-second timeout. Worst case: 60s + 1s + 60s = **121 seconds** of silence. During this time, the client-side narration timer cycles through stages and gets stuck on "Almost there..." (the last stage). The server DOES eventually send `status: "live"` with `buildFailed: true`, but users abandon before then.

### Fix Strategy

Add intermediate SSE feedback during bundle retry, and improve the failure messaging.

### File to Modify

#### `src/app/api/generate/route.ts`

**Change 1:** After first bundle failure (line 198-200), send an activity message before retrying:

```typescript
// Inside the first catch block, after the console.error on line 198:
send("activity", { type: "thinking", message: "Preview build hiccup — retrying..." });
await new Promise((r) => setTimeout(r, 1000));
```

**Change 2:** Reduce bundle worker timeout from 60s to 30s. In `src/app/api/generate/run-bundle-worker.ts`, change the timeout value:

```typescript
// Change timeout from 60000 to 30000
const TIMEOUT_MS = 30_000;
```

This reduces worst-case wait from 121s to 61s.

**Change 3:** Improve the second failure message (line 209) to be more actionable:

```typescript
send("activity", {
  type: "complete",
  message: "Preview couldn't be built — your code is saved. Send a follow-up message to fix it."
});
```

---

## Verification

### Auth fix verification
1. Start dev server: `npm run dev`
2. Open `http://localhost:3003/patients` — verify patient list loads
3. Click a patient row or navigate to `/patients/[id]` — verify detail page loads without crash
4. Navigate to goal detail and session note pages — verify they load
5. Hard refresh on `/patients/[id]` — verify no flash of error (the `"skip"` pattern prevents queries until auth propagates)
6. Check browser console — no `ConvexError: Not authenticated` errors

### Builder fix verification
1. Navigate to `/builder?new=1`
2. Enter a prompt to trigger generation
3. If bundle fails: verify "Preview build hiccup — retrying..." message appears
4. If retry also fails: verify "Preview couldn't be built" message appears with clear next steps
5. Verify the session transitions to "live" (not stuck in generating)

### Existing tests
```bash
npm test  # Vitest unit tests — verify no regressions
```
