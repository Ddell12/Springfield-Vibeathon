# Speech Coach Review Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Speech Coach sessions finish with a reliable transcript-first results flow, including explicit analysis states, retryable failed review, and live target-card feedback.

**Architecture:** Extend the existing `speechCoachSessions` and `speechCoachProgress` data model so the backend tracks `transcript_ready`, `analyzing`, and `review_failed` explicitly instead of overloading `completed`, but do it with compatibility for legacy `completed` rows and an idempotent one-record-per-session progress model. Keep transcript storage on the session, enrich the progress payload with transcript turns and score cards, update the React session and history surfaces to render transcript-first results, and treat live target-card feedback as a separate runtime-event pipeline rather than a reuse of post-session analysis structures.

**Tech Stack:** Convex schema/functions/actions, Next.js App Router, React, LiveKit Agents SDK, Vitest, React Testing Library

---

## File Structure Map

### Existing files to modify

- `convex/schema.ts`
  Responsibility: Extend `speechCoachSessions` and `speechCoachProgress` with explicit review states, transcript turn data, score fields, and retry metadata.
- `convex/speechCoach.ts`
  Responsibility: Update lifecycle mutations and detail queries to support `analyzing`, `review_failed`, transcript-first results, and retry review.
- `convex/speechCoachActions.ts`
  Responsibility: Convert analysis from best-effort fire-and-forget into explicit state transitions with transcript extraction, timeout-safe failure handling, richer AI analysis, and idempotent retry.
- `convex/speechCoachRuntimeActions.ts`
  Responsibility: Keep runtime launch behavior aligned with the explicit review state machine and live-session event contract.
- `convex/__tests__/speechCoach.test.ts`
  Responsibility: Cover the new lifecycle states, transcript-first detail query behavior, and retry mutation behavior.
- `src/features/speech-coach/hooks/use-speech-session.ts`
  Responsibility: Keep the client session state aligned with backend review states so “done” does not mean “analysis finished.”
- `src/features/speech-coach/components/speech-coach-page.tsx`
  Responsibility: Replace the current generic post-session screen with a review-aware results state and refresh entry into history/results.
- `src/features/speech-coach/components/session-history.tsx`
  Responsibility: Render new status labels, transcript-first fallback, retry review affordance, and richer expanded detail.
- `src/features/speech-coach/components/progress-card.tsx`
  Responsibility: Render score cards, insight groups, and transcript turns instead of only summary plus sound list.
- `src/features/speech-coach/components/active-session.tsx`
  Responsibility: Replace the bare listening orb with target-card, attempt-state, green-check, and milestone celebration UI.

### New files to create

- `src/features/speech-coach/lib/session-analysis.ts`
  Responsibility: Shared frontend display types and formatting helpers for transcript turns, status presentation, score labels, and result fallbacks only.
- `src/features/speech-coach/components/__tests__/progress-card.test.tsx`
  Responsibility: Validate score card, insight, and transcript rendering.
- `src/features/speech-coach/components/__tests__/session-history.test.tsx`
  Responsibility: Validate status labels, retry affordance, and transcript-first fallback messaging.
- `src/features/speech-coach/components/__tests__/active-session.test.tsx`
  Responsibility: Validate target-card rendering, success state, and milestone-only celebration behavior.

## Review Amendments

- Add a compatibility step for legacy `completed` sessions so historical rows continue to render correctly until backfilled or widened.
- Enforce one progress record per session through query shape and mutation logic. Do not leave idempotency as a verbal decision only.
- `retryReview` must be a user-triggered mutation with status preconditions and concurrency guards for double-click or already-analyzing cases.
- `session-analysis.ts` is display-only. Server-side analysis logic stays in Convex.
- `speechCoachRuntimeActions.ts` must stay aligned with the new review state machine and the separate live runtime event contract.
- Eval coverage for the richer analysis prompt is required work, not a nice-to-have.

## Task 1: Add Explicit Review States To Convex Schema

**Files:**
- Modify: `convex/schema.ts`
- Test: `convex/__tests__/speechCoach.test.ts`

- [ ] **Step 1: Write the failing schema/lifecycle tests**

```ts
it("endSession moves a finished session into analyzing instead of completed", async () => {
  const t = convexTest(schema, modules);
  const { programId } = await setupSpeechCoachProgram(t);
  const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

  const sessionId = await caregiver.mutation(api.speechCoach.createSession, {
    homeProgramId: programId,
    config: { targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 },
  });
  await caregiver.mutation(api.speechCoach.startSession, {
    sessionId,
    conversationId: "conv_review_state",
  });

  await caregiver.mutation(api.speechCoach.endSession, { sessionId });

  const session = await t.run((ctx) => ctx.db.get(sessionId));
  expect(session?.status).toBe("analyzing");
});

it("saveProgress stores transcript turns and score cards before patching analyzed", async () => {
  const t = convexTest(schema, modules);
  const sessionId = await t.run((ctx) =>
    ctx.db.insert("speechCoachSessions", {
      caregiverUserId: "caregiver-789",
      agentId: "speech-coach",
      status: "analyzing",
      config: { targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 },
    })
  );

  await t.mutation(internal.speechCoach.saveProgress, {
    sessionId,
    caregiverUserId: "caregiver-789",
    userId: undefined,
    patientId: undefined,
    transcriptTurns: [
      {
        speaker: "coach",
        text: "Say sad",
        targetItemId: "sad",
        targetLabel: "sad",
        attemptOutcome: "incorrect",
        retryCount: 0,
        timestampMs: 1,
      },
    ],
    scoreCards: {
      overall: 72,
      productionAccuracy: 68,
      consistency: 70,
      cueingSupport: 55,
      engagement: 80,
    },
    insights: {
      strengths: ["Strong imitation with direct cueing"],
      patterns: ["Final consonant deletion on /d/ words"],
      notableCueingPatterns: ["Best accuracy after immediate model"],
      recommendedNextTargets: ["/s/", "/d/"],
      homePracticeNotes: ["Practice one-syllable /s/ words with visual cues"],
    },
    soundsAttempted: [],
    overallEngagement: "medium",
    recommendedNextFocus: ["/d/"],
    summary: "Needed cueing but stayed engaged.",
    analyzedAt: Date.now(),
  });

  const progress = await t.run((ctx) =>
    ctx.db.query("speechCoachProgress").withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId)).first()
  );
  expect(progress?.transcriptTurns).toHaveLength(1);
  expect(progress?.scoreCards.overall).toBe(72);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- convex/__tests__/speechCoach.test.ts`
Expected: FAIL with status assertions still seeing `completed` and missing `transcriptTurns` / `scoreCards` fields.

- [ ] **Step 3: Update the schema and internal validator shapes**

```ts
status: v.union(
  v.literal("configuring"),
  v.literal("active"),
  v.literal("transcript_ready"),
  v.literal("analyzing"),
  v.literal("analyzed"),
  v.literal("review_failed"),
  v.literal("failed")
),
analysisAttempts: v.optional(v.number()),
analysisFailedAt: v.optional(v.number()),
analysisErrorMessage: v.optional(v.string()),

transcriptTurns: v.array(
  v.object({
    speaker: v.union(v.literal("coach"), v.literal("child"), v.literal("system")),
    text: v.string(),
    targetItemId: v.optional(v.string()),
    targetLabel: v.optional(v.string()),
    targetVisualUrl: v.optional(v.string()),
    attemptOutcome: v.optional(
      v.union(
        v.literal("correct"),
        v.literal("approximate"),
        v.literal("incorrect"),
        v.literal("no_response")
      )
    ),
    retryCount: v.number(),
    timestampMs: v.number(),
  })
),
scoreCards: v.object({
  overall: v.number(),
  productionAccuracy: v.number(),
  consistency: v.number(),
  cueingSupport: v.number(),
  engagement: v.number(),
}),
insights: v.object({
  strengths: v.array(v.string()),
  patterns: v.array(v.string()),
  notableCueingPatterns: v.array(v.string()),
  recommendedNextTargets: v.array(v.string()),
  homePracticeNotes: v.array(v.string()),
}),
```

- [ ] **Step 4: Update `saveProgress` args and lifecycle patching**

```ts
const existing = await ctx.db
  .query("speechCoachProgress")
  .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
  .first();

if (existing) {
  await ctx.db.patch(existing._id, {
    transcriptTurns: args.transcriptTurns,
    scoreCards: args.scoreCards,
    insights: args.insights,
    soundsAttempted: args.soundsAttempted,
    overallEngagement: args.overallEngagement,
    recommendedNextFocus: args.recommendedNextFocus,
    summary: args.summary,
    analyzedAt: args.analyzedAt,
  });
} else {
  await ctx.db.insert("speechCoachProgress", {
    sessionId: args.sessionId,
    patientId: args.patientId,
    caregiverUserId: args.caregiverUserId,
    userId: args.userId,
    transcriptTurns: args.transcriptTurns,
    scoreCards: args.scoreCards,
    insights: args.insights,
    soundsAttempted: args.soundsAttempted,
    overallEngagement: args.overallEngagement,
    recommendedNextFocus: args.recommendedNextFocus,
    summary: args.summary,
    analyzedAt: args.analyzedAt,
  });
}

await ctx.db.patch(args.sessionId, {
  status: "analyzed",
  analysisErrorMessage: undefined,
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- convex/__tests__/speechCoach.test.ts`
Expected: PASS for the new schema/lifecycle coverage.

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/speechCoach.ts convex/__tests__/speechCoach.test.ts
git commit -m "feat: add explicit speech coach review states"
```

## Task 2: Make Analysis Action Explicit, Retryable, And Transcript-First

**Files:**
- Modify: `convex/speechCoach.ts`
- Modify: `convex/speechCoachActions.ts`
- Test: `convex/__tests__/speechCoach.test.ts`

- [ ] **Step 1: Write the failing action-state tests**

```ts
it("markReviewFailed stores a retryable review failure instead of leaving analyzing forever", async () => {
  const t = convexTest(schema, modules);
  const sessionId = await t.run((ctx) =>
    ctx.db.insert("speechCoachSessions", {
      caregiverUserId: "caregiver-789",
      agentId: "speech-coach",
      status: "analyzing",
      config: { targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 },
    })
  );

  await t.mutation(internal.speechCoach.markReviewFailed, {
    sessionId,
    errorMessage: "Review timed out after 90 seconds",
  });

  const session = await t.run((ctx) => ctx.db.get(sessionId));
  expect(session?.status).toBe("review_failed");
  expect(session?.analysisErrorMessage).toContain("90 seconds");
});

it("retryReview moves review_failed back to analyzing and increments attempts", async () => {
  const t = convexTest(schema, modules);
  const { programId } = await setupSpeechCoachProgram(t);
  const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
  const sessionId = await t.run((ctx) =>
    ctx.db.insert("speechCoachSessions", {
      homeProgramId: programId,
      caregiverUserId: "caregiver-789",
      patientId: (null as never),
      agentId: "speech-coach",
      status: "review_failed",
      analysisAttempts: 1,
      config: { targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 },
    })
  );

  await caregiver.mutation(api.speechCoach.retryReview, { sessionId });

  const session = await t.run((ctx) => ctx.db.get(sessionId));
  expect(session?.status).toBe("analyzing");
  expect(session?.analysisAttempts).toBe(2);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- convex/__tests__/speechCoach.test.ts`
Expected: FAIL with missing `markReviewFailed` / `retryReview`.

- [ ] **Step 3: Add explicit helper mutations in `convex/speechCoach.ts`**

```ts
export const markTranscriptReady = internalMutation({
  args: { sessionId: v.id("speechCoachSessions"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      transcriptStorageId: args.storageId,
      status: "transcript_ready",
    });
  },
});

export const markAnalyzing = internalMutation({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    await ctx.db.patch(args.sessionId, {
      status: "analyzing",
      analysisAttempts: (session?.analysisAttempts ?? 0) + 1,
      analysisErrorMessage: undefined,
    });
  },
});

export const markReviewFailed = internalMutation({
  args: { sessionId: v.id("speechCoachSessions"), errorMessage: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "review_failed",
      analysisFailedAt: Date.now(),
      analysisErrorMessage: args.errorMessage,
    });
  },
});

export const retryReview = mutation({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");
    if (session.patientId) await assertPatientAccess(ctx, session.patientId);
    if (session.status === "analyzing") throw new ConvexError("Review already in progress");
    if (session.status !== "review_failed") throw new ConvexError("Review is not retryable");
    await ctx.db.patch(args.sessionId, {
      status: "analyzing",
      analysisAttempts: (session.analysisAttempts ?? 0) + 1,
      analysisErrorMessage: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.speechCoachActions.analyzeSession, {
      sessionId: args.sessionId,
    });
  },
});
```

- [ ] **Step 4: Update `endSession` and `analyzeSession` to use explicit states**

```ts
await ctx.db.patch(args.sessionId, {
  status: "analyzing",
  endedAt: Date.now(),
});

const transcriptBlob = new Blob([transcript], { type: "application/json" });
const storageId = await ctx.storage.store(transcriptBlob);
await ctx.runMutation(internal.speechCoach.markTranscriptReady, {
  sessionId: args.sessionId,
  storageId,
});
await ctx.runMutation(internal.speechCoach.markAnalyzing, {
  sessionId: args.sessionId,
});

if (!response.ok) {
  await ctx.runMutation(internal.speechCoach.markReviewFailed, {
    sessionId: args.sessionId,
    errorMessage: `Transcript fetch failed with ${response.status}`,
  });
  return;
}
```

- [ ] **Step 5: Expand Claude output contract to include scores and transcript turns**

```ts
Respond with JSON matching this exact shape:
{
  "transcriptTurns": [
    {
      "speaker": "coach",
      "text": "Say sad",
      "targetItemId": "sad",
      "targetLabel": "sad",
      "attemptOutcome": "incorrect",
      "retryCount": 0,
      "timestampMs": 1200
    }
  ],
  "scoreCards": {
    "overall": 72,
    "productionAccuracy": 68,
    "consistency": 70,
    "cueingSupport": 55,
    "engagement": 80
  },
  "insights": {
    "strengths": ["..."],
    "patterns": ["..."],
    "notableCueingPatterns": ["..."],
    "recommendedNextTargets": ["/s/"],
    "homePracticeNotes": ["..."]
  },
  "soundsAttempted": [],
  "overallEngagement": "medium",
  "recommendedNextFocus": ["/s/"],
  "summary": "..."
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- convex/__tests__/speechCoach.test.ts`
Expected: PASS with review failure and retry behavior covered.

- [ ] **Step 7: Commit**

```bash
git add convex/speechCoach.ts convex/speechCoachActions.ts convex/__tests__/speechCoach.test.ts
git commit -m "feat: make speech coach review explicit and retryable"
```

## Task 3: Return Transcript-First Results To The Frontend

**Files:**
- Create: `src/features/speech-coach/lib/session-analysis.ts`
- Modify: `src/features/speech-coach/components/progress-card.tsx`
- Modify: `src/features/speech-coach/components/session-history.tsx`
- Create: `src/features/speech-coach/components/__tests__/progress-card.test.tsx`
- Create: `src/features/speech-coach/components/__tests__/session-history.test.tsx`

- [ ] **Step 1: Write the failing component tests**

```tsx
it("renders score cards, insight groups, and transcript turns", () => {
  render(
    <ProgressCard
      progress={{
        summary: "Needed cueing but stayed engaged.",
        soundsAttempted: [],
        overallEngagement: "medium",
        recommendedNextFocus: ["/s/"],
        scoreCards: {
          overall: 72,
          productionAccuracy: 68,
          consistency: 70,
          cueingSupport: 55,
          engagement: 80,
        },
        insights: {
          strengths: ["Strong imitation after a direct model"],
          patterns: ["Dropped final /d/ in sad"],
          notableCueingPatterns: ["Best after immediate repetition"],
          recommendedNextTargets: ["/s/"],
          homePracticeNotes: ["Practice sad, sun, sock with a visual card"],
        },
        transcriptTurns: [
          {
            speaker: "coach",
            text: "Say sad",
            targetLabel: "sad",
            attemptOutcome: "incorrect",
            retryCount: 0,
            timestampMs: 1000,
          },
        ],
      }}
    />
  );

  expect(screen.getByText("Overall")).toBeInTheDocument();
  expect(screen.getByText("Strong imitation after a direct model")).toBeInTheDocument();
  expect(screen.getByText("Say sad")).toBeInTheDocument();
});

it("shows retry review when a session is review_failed but transcript exists", async () => {
  render(<SessionHistory patientId={"fake" as never} />);
  expect(await screen.findByText("Retry review")).toBeInTheDocument();
  expect(screen.getByText("Transcript available while review is retried.")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/speech-coach/components/__tests__/progress-card.test.tsx src/features/speech-coach/components/__tests__/session-history.test.tsx`
Expected: FAIL because the current components do not render score cards, transcript turns, or retry actions.

- [ ] **Step 3: Create shared analysis types**

```ts
export type TranscriptTurn = {
  speaker: "coach" | "child" | "system";
  text: string;
  targetItemId?: string;
  targetLabel?: string;
  targetVisualUrl?: string;
  attemptOutcome?: "correct" | "approximate" | "incorrect" | "no_response";
  retryCount: number;
  timestampMs: number;
};

export type ScoreCards = {
  overall: number;
  productionAccuracy: number;
  consistency: number;
  cueingSupport: number;
  engagement: number;
};

export function getSessionStatusLabel(status: string) {
  return {
    configuring: "Setting up",
    active: "In progress",
    transcript_ready: "Transcript saved",
    analyzing: "Reviewing",
    analyzed: "Complete",
    review_failed: "Review failed",
    failed: "Failed",
  }[status] ?? "Unknown";
}
```

- [ ] **Step 4: Rewrite `ProgressCard` around score-first results**

```tsx
<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
  {[
    ["Overall", progress.scoreCards.overall],
    ["Accuracy", progress.scoreCards.productionAccuracy],
    ["Consistency", progress.scoreCards.consistency],
    ["Cueing", progress.scoreCards.cueingSupport],
    ["Engagement", progress.scoreCards.engagement],
  ].map(([label, value]) => (
    <div key={label} className="rounded-xl bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  ))}
</div>

<section>
  <h4 className="text-sm font-semibold text-foreground">Transcript</h4>
  {progress.transcriptTurns.map((turn, index) => (
    <div key={`${turn.speaker}-${index}`} className="rounded-lg bg-background/80 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {turn.speaker}
        </span>
        {turn.attemptOutcome ? <span>{turn.attemptOutcome}</span> : null}
      </div>
      <p className="mt-2 text-sm text-foreground">{turn.text}</p>
    </div>
  ))}
</section>
```

- [ ] **Step 5: Update `SessionHistory` expanded detail states**

```tsx
if (!detail.progress && detail.session?.status === "review_failed") {
  return (
    <div className="px-4 pb-4">
      <p className="text-sm text-foreground">Review failed. Transcript available while review is retried.</p>
      <Button size="sm" variant="outline" onClick={() => retryReview({ sessionId })}>
        Retry review
      </Button>
    </div>
  );
}

if (!detail.progress && detail.session?.status === "analyzing") {
  return <div className="px-4 pb-4 text-sm text-muted-foreground">Transcript saved. AI review is in progress.</div>;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/features/speech-coach/components/__tests__/progress-card.test.tsx src/features/speech-coach/components/__tests__/session-history.test.tsx`
Expected: PASS with transcript-first rendering and retry affordance covered.

- [ ] **Step 7: Commit**

```bash
git add src/features/speech-coach/lib/session-analysis.ts src/features/speech-coach/components/progress-card.tsx src/features/speech-coach/components/session-history.tsx src/features/speech-coach/components/__tests__/progress-card.test.tsx src/features/speech-coach/components/__tests__/session-history.test.tsx
git commit -m "feat: add transcript-first speech coach results UI"
```

## Task 4: Align Client Session Flow With Backend Review States

**Files:**
- Modify: `src/features/speech-coach/hooks/use-speech-session.ts`
- Modify: `src/features/speech-coach/components/speech-coach-page.tsx`
- Test: `src/features/speech-coach/components/__tests__/session-history.test.tsx`

- [ ] **Step 1: Write the failing UI-state test**

```tsx
it("shows reviewing copy after a session ends instead of treating analysis as complete", async () => {
  render(<SpeechCoachPage patientId={"fake" as never} homeProgramId={"fake" as never} />);
  expect(await screen.findByText("Reviewing the session...")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/speech-coach/components/__tests__/session-history.test.tsx`
Expected: FAIL because the page still moves from `ending` straight to generic `done`.

- [ ] **Step 3: Split local phase from backend review completion**

```ts
type SessionPhase =
  | "idle"
  | "connecting"
  | "active"
  | "ending"
  | "reviewing"
  | "done"
  | "error";

const endSession = useCallback(async () => {
  if (!sessionId) return;
  setPhase("ending");
  try {
    await endSessionMutation({ sessionId });
    setPhase("reviewing");
  } catch (err) {
    console.error("[SpeechCoach] End session error:", err);
    setPhase("error");
  }
}, [sessionId, endSessionMutation]);
```

- [ ] **Step 4: Update page-level review/results copy**

```tsx
if (session.phase === "reviewing") {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <h2 className="font-headline text-2xl font-bold text-foreground">Reviewing the session...</h2>
      <p className="text-muted-foreground">
        We saved the transcript and are preparing a therapist-friendly summary.
      </p>
      <button
        type="button"
        onClick={() => setActiveTab("history")}
        className="text-sm font-medium text-primary underline"
      >
        View session status
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/features/speech-coach/components/__tests__/session-history.test.tsx`
Expected: PASS with the reviewing state visible to users.

- [ ] **Step 6: Commit**

```bash
git add src/features/speech-coach/hooks/use-speech-session.ts src/features/speech-coach/components/speech-coach-page.tsx
git commit -m "feat: align speech coach client flow with review states"
```

## Task 5: Add Live Target Card And Milestone Feedback UI

**Files:**
- Modify: `src/features/speech-coach/components/active-session.tsx`
- Modify: `src/features/speech-coach/livekit/agent.ts`
- Create: `src/features/speech-coach/components/__tests__/active-session.test.tsx`

- [ ] **Step 1: Write the failing live-session UI tests**

```tsx
it("shows the active target card and green check for a correct attempt", () => {
  render(
    <ActiveSession
      runtimeSession={{ runtime: "livekit-agent", roomName: "room", serverUrl: "wss://x", tokenPath: "/api/token" }}
      onConversationStarted={() => undefined}
      onEnd={() => undefined}
      durationMinutes={5}
      sessionConfig={{ targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 }}
      speechCoachConfig={undefined}
    />
  );

  expect(screen.getByText("Current practice")).toBeInTheDocument();
  expect(screen.queryByText("Nice job")).not.toBeNull();
});

it("shows fireworks only when the attempt count hits a milestone", () => {
  expect(getCelebrationMode({ totalCorrect: 3 })).toBe("check");
  expect(getCelebrationMode({ totalCorrect: 5 })).toBe("milestone");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/speech-coach/components/__tests__/active-session.test.tsx`
Expected: FAIL because the current session UI only renders a listening orb and stop button.

- [ ] **Step 3: Add deterministic session UI state helpers**

```ts
type SessionVisualState = {
  targetLabel: string;
  targetVisualUrl?: string;
  promptState: "listen" | "your_turn" | "try_again" | "nice_job";
  attemptOutcome?: "correct" | "approximate" | "incorrect" | "no_response";
  totalCorrect: number;
};

export function getCelebrationMode({ totalCorrect }: { totalCorrect: number }) {
  return totalCorrect > 0 && totalCorrect % 5 === 0 ? "milestone" : "check";
}
```

- [ ] **Step 4: Replace the center orb with a target-card layout**

```tsx
<div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6">
  <div className="w-full rounded-3xl bg-background p-6 shadow-sm">
    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Current practice</p>
    <div className="mt-4 flex flex-col items-center gap-4">
      <div className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-3xl bg-muted/40">
        {visual.targetVisualUrl ? (
          <img src={visual.targetVisualUrl} alt={visual.targetLabel} className="h-full w-full object-cover" />
        ) : (
          <span className="font-headline text-5xl text-foreground">{visual.targetLabel}</span>
        )}
      </div>
      <p className="font-headline text-3xl text-foreground">{visual.targetLabel}</p>
      <p className="text-sm text-muted-foreground">{promptCopy[visual.promptState]}</p>
      {visual.attemptOutcome === "correct" ? <div aria-label="correct-attempt">✓</div> : null}
      {getCelebrationMode({ totalCorrect: visual.totalCorrect }) === "milestone" ? <div aria-hidden="true">Fireworks</div> : null}
    </div>
  </div>
</div>
```

- [ ] **Step 5: Thread stable target labels from the runtime launch context**

```ts
export function createSpeechCoachAgent(config: {
  instructions: string;
  tools: string[];
  targetItems?: Array<{ id: string; label: string; visualUrl?: string }>;
}): voice.Agent {
  const targetSummary = (config.targetItems ?? [])
    .map((item) => `${item.label}${item.visualUrl ? ` (${item.visualUrl})` : ""}`)
    .join(", ");

  return new voice.Agent({
    instructions: `${config.instructions}\nUse only these planned target items during prompting: ${targetSummary}`,
  });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/features/speech-coach/components/__tests__/active-session.test.tsx`
Expected: PASS with target-card and milestone behavior covered.

- [ ] **Step 7: Commit**

```bash
git add src/features/speech-coach/components/active-session.tsx src/features/speech-coach/livekit/agent.ts src/features/speech-coach/components/__tests__/active-session.test.tsx
git commit -m "feat: add live speech coach target-card feedback"
```

## Task 6: Full Verification Pass

**Files:**
- Modify: none unless fixes are required
- Test: `convex/__tests__/speechCoach.test.ts`
- Test: `src/features/speech-coach/components/__tests__/progress-card.test.tsx`
- Test: `src/features/speech-coach/components/__tests__/session-history.test.tsx`
- Test: `src/features/speech-coach/components/__tests__/active-session.test.tsx`

- [ ] **Step 1: Run focused backend and frontend tests**

Run: `npm test -- convex/__tests__/speechCoach.test.ts src/features/speech-coach/components/__tests__/progress-card.test.tsx src/features/speech-coach/components/__tests__/session-history.test.tsx src/features/speech-coach/components/__tests__/active-session.test.tsx`
Expected: PASS with all new lifecycle, results, and live-session coverage green.

- [ ] **Step 2: Run broader speech-coach regression tests**

Run: `npm test -- speech-coach`
Expected: PASS with no regressions in related speech-coach components and hooks.

- [ ] **Step 3: Run type-check verification**

Run: `npx tsc --noEmit`
Expected: PASS with schema, frontend status, and runtime-event contract changes reflected across the codebase.

- [ ] **Step 4: Run Convex validation**

Run: `npx convex dev --once`
Expected: PASS with schema and function definitions accepted by Convex.

- [ ] **Step 5: Run analysis eval coverage**

Run: `npm test -- speechCoachAnalysis.eval`
Expected: PASS with at least happy path, sparse-response, and retry/failure fixtures validating the richer AI output contract.

- [ ] **Step 6: Manually verify the live and review flows**

```txt
1. Sign in as caregiver and start a speech coach session.
2. Confirm the active target card appears and the old “ear only” UI is gone.
3. End the session and confirm the UI says “Reviewing the session...” instead of pretending it is finished.
4. Open History and confirm the session reaches Complete or Review failed within 90 seconds.
5. If review fails, confirm transcript fallback and Retry review appear.
6. If review succeeds, confirm scores, insights, and transcript all appear on one screen.
7. Retry review twice quickly and confirm the second attempt is rejected cleanly.
8. Open legacy `completed` rows and confirm they still render sensibly during compatibility rollout.
```

- [ ] **Step 7: Commit any final verification fixes**

```bash
git add convex/__tests__/speechCoach.test.ts src/features/speech-coach
git commit -m "test: verify speech coach review reliability flow"
```

## Self-Review

### Spec Coverage

- Terminal state within 90 seconds: covered by Task 2 state helpers and failure path.
- Transcript-first results: covered by Tasks 1 through 4.
- Useful scores and insights: covered by Tasks 1 through 3.
- Retry review: covered by Tasks 2 and 3.
- Live target-card plus green check and milestone fireworks: covered by Task 5.

### Placeholder Scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Every task includes file paths, commands, and code snippets.

### Type Consistency

- Status names used consistently: `transcript_ready`, `analyzing`, `analyzed`, `review_failed`.
- Transcript turn names used consistently: `transcriptTurns`, `targetLabel`, `attemptOutcome`, `retryCount`, `timestampMs`.
- Score object names used consistently: `scoreCards.overall`, `productionAccuracy`, `consistency`, `cueingSupport`, `engagement`.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 12 issues resolved, migration/retry/idempotency/eval gaps folded into the plan |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

**OUTSIDE VOICE:** Claude Code CLI run captured 6 additional plan fixes, all accepted.
**UNRESOLVED:** 0
**VERDICT:** ENG CLEARED — ready to implement.
