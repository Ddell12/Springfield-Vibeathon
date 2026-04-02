# Fix All Outstanding E2E Issues

**Context:** E2E testing on 2026-04-02 found 4 categories of bugs. Three were fixed inline during the session (Radix `SelectItem value=""` crash, `tools.listByPatient` missing auth, `tools.getEventSummaryByPatient` missing auth). This plan covers the remaining issues: (1) speech coach reviewing phase permanently stuck, (2) 8+ `slpQuery` handlers crashing the error boundary by throwing instead of returning empty, (3) 40+ unbounded `.collect()` calls in production queries, (4) `SessionConfig` silently swallowing start errors.

---

## Phase 1 — slpQuery Throw → Return [] (crash risk)

`slpQuery`'s own contract (comment in `customFunctions.ts:34`) says handlers should return null/[] when `slpUserId` is null, not throw. These throw during the initial auth race and crash the page error boundary.

**Pattern:** `if (!slpUserId) throw new ConvexError(...)` → `return []` (list) or `return null` (single)

### `convex/goals.ts`
- Line 70 (`list`): `throw` → `return []`
- Line 86 (`listActive`): `throw` → `return []`
- Line 126 (`get`): `throw` → `return null`
- Line 138 (`getWithProgress`): `throw` → `return null`
> `get` and `getWithProgress` return type becomes `… | null`. Check callers: `src/features/goals/components/goal-detail.tsx` and `src/features/goals/components/goals-list.tsx` — add null guards where needed.

### `convex/evaluations.ts`
- Line 55 (`get`): `throw` → `return null`
- Line 66 (`getByPatient`): `throw` → `return []`

### `convex/progressData.ts`
- Line 19 (`listByGoal`): `throw` → `return []`
- Line 40 (`listByPatient`): `throw` → `return []`

### `convex/sessionTrials.ts`
- Line 139 (`getActiveForPatient`): `throw` → `return []`
- Line 157 (`listBySessionNote`): `throw` → `return []`
- Line 172 (`listByPatientDate`): `throw` → `return []`

**Deploy:** `npx convex dev --once` after this phase.

---

## Phase 2 — Speech Coach Reviewing Phase Never Exits

**Root cause:** `use-speech-session.ts:88` sets phase to `"reviewing"` then stops watching. The server transitions `speechCoachSessions.status` to `"analyzed"` or `"review_failed"` via scheduled action, but the client never subscribes to that change.

**Available (no new code needed on server):**
- `api.speechCoach.getSessionDetail` — returns `{ session, progress }`, uses auth
- `api.speechCoach.retryReview` — mutation to retry failed analysis
- `internal.speechCoach.markReviewFailed` — sets status + errorMessage
- `src/features/speech-coach/components/progress-card.tsx` — full results UI exists

### 2a. Add 90-second server-side timeout — `convex/speechCoachActions.ts`

Add new `internalAction` at the bottom:

```ts
export const checkSessionTimeout = internalAction({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(internal.speechCoach.getSessionById, {
      sessionId: args.sessionId,
    });
    if (session?.status === "analyzing") {
      await ctx.runMutation(internal.speechCoach.markReviewFailed, {
        sessionId: args.sessionId,
        errorMessage: "Review timed out after 90 seconds.",
      });
    }
  },
});
```

### 2b. Schedule timeout in endSession/endStandaloneSession — `convex/speechCoach.ts`

In `endSession` handler (~line 113, after the `ctx.db.patch` that sets `status: "analyzing"`):
```ts
await ctx.scheduler.runAfter(90_000, internal.speechCoachActions.checkSessionTimeout, {
  sessionId: args.sessionId,
});
```
Same addition in `endStandaloneSession` (~line 508).

### 2c. Add live subscription to both hooks

**`src/features/speech-coach/hooks/use-speech-session.ts`**

Add `useQuery` and `useEffect` to imports (line 3–4):
```ts
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
```

Add inside the hook body after the existing state declarations:
```ts
const sessionDetail = useQuery(
  api.speechCoach.getSessionDetail,
  phase === "reviewing" && sessionId ? { sessionId } : "skip"
);

useEffect(() => {
  if (phase !== "reviewing") return;
  const status = sessionDetail?.session.status;
  if (status === "analyzed") {
    setPhase("done");
  } else if (status === "review_failed") {
    setError(sessionDetail?.session.analysisErrorMessage ?? "Review failed.");
    setPhase("error");
  }
}, [phase, sessionDetail]);
```

Expose in the return (line 103):
```ts
return { phase, sessionId, runtimeSession, error, durationMinutes,
         sessionConfig, begin, markActive, endSession, reset, sessionDetail };
```

**`src/features/speech-coach/hooks/use-standalone-speech-session.ts`** — identical changes.

### 2d. Update reviewing UI — `src/features/speech-coach/components/speech-coach-page.tsx`

Replace lines 87–106 with three sub-states based on `sessionDetail`:

```tsx
if (session.phase === "reviewing") {
  const status = session.sessionDetail?.session.status;
  const progress = session.sessionDetail?.progress;

  // Results ready — show inline ProgressCard
  if (status === "analyzed" && progress) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-8 max-w-2xl mx-auto w-full">
        <div>
          <p className="text-4xl mb-2" aria-hidden="true">🎉</p>
          <h2 className="font-headline text-2xl font-bold text-foreground">Session complete!</h2>
        </div>
        <ProgressCard progress={progress} />
        <button type="button" onClick={() => { session.reset(); setActiveTab("history"); }}
          className="text-sm font-medium text-primary underline self-start">
          View full history
        </button>
      </div>
    );
  }

  // Review failed — show error + retry
  if (status === "review_failed") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="font-headline text-xl font-bold">Review didn't complete</h2>
        <p className="text-sm text-muted-foreground">
          {session.sessionDetail?.session.analysisErrorMessage ?? "Something went wrong."}
        </p>
        <RetryButton sessionId={session.sessionId} />
        <button type="button" onClick={() => { session.reset(); setActiveTab("history"); }}
          className="text-sm font-medium text-primary underline">
          View session history
        </button>
      </div>
    );
  }

  // Analyzing in progress
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <h2 className="font-headline text-2xl font-bold">Reviewing the session...</h2>
      <p className="text-muted-foreground">Analyzing transcript. About 30 seconds.</p>
      <button type="button" onClick={() => { session.reset(); setActiveTab("history"); }}
        className="text-sm font-medium text-primary underline">
        Check back later in History
      </button>
    </div>
  );
}
```

Add `RetryButton` helper above the component (uses `api.speechCoach.retryReview`):
```tsx
function RetryButton({ sessionId }: { sessionId: Id<"speechCoachSessions"> | null }) {
  const retry = useMutation(api.speechCoach.retryReview);
  if (!sessionId) return null;
  return (
    <button type="button" onClick={() => retry({ sessionId })}
      className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground">
      Retry review
    </button>
  );
}
```

Add `import { ProgressCard } from "./progress-card";` at the top.

**`src/features/speech-coach/components/standalone-speech-coach-page.tsx`** — identical reviewing block replacement. `RetryButton` can be imported from `speech-coach-page.tsx` or duplicated.

**Deploy:** `npx convex dev --once` (new internalAction + scheduler calls).

---

## Phase 3 — Unbounded .collect() Limits

One-line changes throughout. Replace `.collect()` with `.take(N)`. Skip `demo_seed.ts` and `migrations.ts` (one-time tools).

| File | Line(s) | Change |
|------|---------|--------|
| `convex/goalBank.ts` | 84 | `.take(500)` — full table scan fallback |
| `convex/goalBank.ts` | 106 | `.take(500)` — SLP custom goals |
| `convex/goals.ts` | 118 | `.take(200)` — `listByPatientInternal` |
| `convex/billingRecords.ts` | 75, 97, 105, 130, 138 | `.take(200)` each |
| `convex/evaluations.ts` | 75 | `.take(50)` |
| `convex/appointments.ts` | 29, 36, 129, 142, 182 | `.take(200)` each |
| `convex/sessionTrials.ts` | 148, 162, 179 | `.take(500)` each |
| `convex/notifications.ts` | 35, 57 | `.take(100)` each |
| `convex/plansOfCare.ts` | 51 | `.take(20)` |
| `convex/dischargeSummaries.ts` | 53 | `.take(20)` |
| `convex/intakeForms.ts` | 65, 147, 163, 191 | `.take(50)` each |

**Deploy:** `npx convex dev --once` (all backend changes).

---

## Phase 4 — SessionConfig Error Display

Pure frontend, no Convex deploy needed.

### `src/features/speech-coach/components/session-config.tsx`

Add `error?: string` to the Props type. Render below the start button:
```tsx
{error && (
  <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
    {error}
  </p>
)}
```

### `src/features/speech-coach/components/speech-coach-page.tsx` and `standalone-speech-coach-page.tsx`

Pass the error to `<SessionConfig>`:
```tsx
<SessionConfig ... error={session.error ?? undefined} />
```

---

## Critical Files

| File | Phase |
|------|-------|
| `convex/goals.ts` | 1 |
| `convex/evaluations.ts` | 1, 3 |
| `convex/progressData.ts` | 1 |
| `convex/sessionTrials.ts` | 1, 3 |
| `convex/speechCoachActions.ts` | 2a |
| `convex/speechCoach.ts` | 2b |
| `src/features/speech-coach/hooks/use-speech-session.ts` | 2c |
| `src/features/speech-coach/hooks/use-standalone-speech-session.ts` | 2c |
| `src/features/speech-coach/components/speech-coach-page.tsx` | 2d, 4 |
| `src/features/speech-coach/components/standalone-speech-coach-page.tsx` | 2d, 4 |
| `src/features/speech-coach/components/session-config.tsx` | 4 |
| `convex/goalBank.ts`, `convex/billingRecords.ts`, `convex/appointments.ts`, `convex/notifications.ts`, `convex/plansOfCare.ts`, `convex/dischargeSummaries.ts`, `convex/intakeForms.ts` | 3 |

---

## Verification

1. **Phase 1:** Navigate to `/patients/[id]` (Clinical tab) as a fresh page load while Clerk is still initializing. No error boundary crash on Goals, Evaluations, or Progress sections.

2. **Phase 2:** Start and end a speech coach session. The reviewing screen should auto-transition to the ProgressCard results (no manual navigation needed). To test timeout: temporarily change `90_000` → `5_000` and end a session with no valid analysis environment — the retry button should appear at ~5s.

3. **Phase 3:** After deploying, run `npx convex run goalBank:search '{}'` — should return ≤500 results in <200ms. No full-table-scan timeouts.

4. **Phase 4:** Trigger a session start failure (e.g., deny microphone on a non-HTTPS origin). The error message should appear inline in the SessionConfig form, not silently fail.

5. **Full suite:** `npm test` (636 tests) should pass. `npx convex dev --once` should succeed with no type errors.
