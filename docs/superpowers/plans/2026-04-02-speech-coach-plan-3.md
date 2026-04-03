# Speech Coach — Plan 3: Post-Session Analytics, Progress Reporting, Home Practice

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single `ProgressCard` into audience-specific views (parent-friendly `CaregiverProgressCard` and clinical `SlpProgressCard`), generate IEP note drafts for SLPs, split the Claude analysis into caregiver and SLP passes, and surface home practice frequency data for both audiences.

**Architecture:** The `CaregiverProgressCard` shows narrative summary, today's word list, home practice tip, and next-session recommendation — no numbers, no clinical terms. The `SlpProgressCard` shows position accuracy bars, cue distribution, error patterns, and a copyable IEP note draft, using the new `positionAccuracy` + `cueDistribution` fields stored in `speechCoachProgress`. The analysis pipeline in `speechCoachActions.ts` splits into two sequential Claude calls: a caregiver pass (always runs) and an SLP pass (only when `session.patientId` is present). New Convex queries expose practice frequency data for both audiences. A `CaregiverPracticePanel` and `SlpPracticeFrequencyPanel` surface the data from `practiceLog` and `speechCoachProgress` (already being written but never displayed).

**Tech Stack:** Convex, Claude Sonnet, React, Vitest, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-02-speech-coach-redesign-design.md` §3 and §5

**HIPAA note:** Session transcripts and attempt data are PHI. `SlpProgressCard` and its IEP note draft are rendered only in SLP-authenticated routes. The copy button must NOT offer to share externally — it copies to clipboard only.

**Prerequisite:** Plan 2 must be completed first (requires `rawAttempts` in schema and `logAttemptFromRuntime` action).

---

## File Map

**Create:**
- `src/features/speech-coach/lib/analysis-compute.ts` — computeCueDistribution from rawAttempts
- `src/features/speech-coach/lib/__tests__/analysis-compute.test.ts`
- `src/features/speech-coach/components/caregiver-progress-card.tsx` — parent-friendly post-session view
- `src/features/speech-coach/components/__tests__/caregiver-progress-card.test.tsx`
- `src/features/speech-coach/components/slp-progress-card.tsx` — clinical view with IEP note draft
- `src/features/speech-coach/components/__tests__/slp-progress-card.test.tsx`
- `src/features/speech-coach/components/caregiver-practice-panel.tsx` — home practice panel
- `src/features/speech-coach/components/__tests__/caregiver-practice-panel.test.tsx`
- `src/features/speech-coach/components/session-dot-calendar.tsx` — dot-style session calendar
- `src/features/speech-coach/components/__tests__/session-dot-calendar.test.tsx`
- `src/features/speech-coach/components/slp-practice-frequency-panel.tsx` — SLP frequency view
- `src/features/speech-coach/components/__tests__/slp-practice-frequency-panel.test.tsx`

**Modify:**
- `convex/schema.ts` — add `cueDistribution`, `positionAccuracy`, `iepNoteDraft` to `speechCoachProgress`
- `convex/speechCoach.ts` — update `saveProgress` for new fields; add `getPracticeFrequency` query; add `getLatestProgress` query
- `convex/speechCoachActions.ts` — split analysis prompt; raise transcript minimum to 300 chars; rawAttempts check
- `src/features/speech-coach/components/speech-coach-page.tsx` — use `CaregiverProgressCard` post-session
- `src/features/speech-coach/components/session-history.tsx` — use `SlpProgressCard` in expanded detail
- `src/features/speech-coach/components/session-config.tsx` — add "Based on last session" label
- `src/features/speech-coach/components/__tests__/session-config.test.tsx` — test label

---

## Task 1: Schema — add clinical fields to speechCoachProgress

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1.1: Add cueDistribution, positionAccuracy, iepNoteDraft to speechCoachProgress**

In `convex/schema.ts`, inside the `speechCoachProgress` table, add after the existing `insights` field:

```typescript
// After:
    insights: v.optional(v.object({

// Insert before the closing }) of the table:
    cueDistribution: v.optional(v.object({
      spontaneous: v.number(),
      model: v.number(),
      phoneticCue: v.number(),
      directCorrection: v.number(),
    })),
    positionAccuracy: v.optional(v.array(v.object({
      sound: v.string(),
      position: v.union(
        v.literal("initial"),
        v.literal("medial"),
        v.literal("final"),
        v.literal("unknown")
      ),
      correct: v.number(),
      total: v.number(),
    }))),
    iepNoteDraft: v.optional(v.string()),
```

- [ ] **Step 1.2: Verify schema compiles**

```bash
cd /Users/desha/Springfield-Vibeathon
npx convex dev --once 2>&1 | tail -10
```

Expected: exits 0.

- [ ] **Step 1.3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add cueDistribution, positionAccuracy, iepNoteDraft to speechCoachProgress"
```

---

## Task 2: analysis-compute.ts — computeCueDistribution from rawAttempts

**Files:**
- Create: `src/features/speech-coach/lib/analysis-compute.ts`
- Create: `src/features/speech-coach/lib/__tests__/analysis-compute.test.ts`

- [ ] **Step 2.1: Write the failing test**

Create `src/features/speech-coach/lib/__tests__/analysis-compute.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { computeCueDistribution } from "../analysis-compute";

const ATTEMPTS = [
  { targetLabel: "sun", outcome: "correct" as const, retryCount: 0, timestampMs: 1000 },
  { targetLabel: "sock", outcome: "correct" as const, retryCount: 1, timestampMs: 2000 },
  { targetLabel: "soap", outcome: "approximate" as const, retryCount: 2, timestampMs: 3000 },
  { targetLabel: "sand", outcome: "incorrect" as const, retryCount: 3, timestampMs: 4000 },
  { targetLabel: "seal", outcome: "no_response" as const, retryCount: 3, timestampMs: 5000 },
];

describe("computeCueDistribution", () => {
  it("returns zero percentages for empty attempts", () => {
    const result = computeCueDistribution([]);
    expect(result.spontaneous).toBe(0);
    expect(result.model).toBe(0);
    expect(result.phoneticCue).toBe(0);
    expect(result.directCorrection).toBe(0);
  });

  it("correctly maps retryCount 0 to spontaneous", () => {
    const result = computeCueDistribution(ATTEMPTS);
    // 1 out of 5 attempts had retryCount 0
    expect(result.spontaneous).toBe(20);
  });

  it("correctly maps retryCount 1 to model", () => {
    const result = computeCueDistribution(ATTEMPTS);
    // 1 out of 5 attempts had retryCount 1
    expect(result.model).toBe(20);
  });

  it("correctly maps retryCount 2 to phoneticCue", () => {
    const result = computeCueDistribution(ATTEMPTS);
    // 1 out of 5 attempts had retryCount 2
    expect(result.phoneticCue).toBe(20);
  });

  it("correctly maps retryCount 3+ to directCorrection", () => {
    const result = computeCueDistribution(ATTEMPTS);
    // 2 out of 5 attempts had retryCount >= 3
    expect(result.directCorrection).toBe(40);
  });

  it("percentages sum to 100 for non-empty input", () => {
    const result = computeCueDistribution(ATTEMPTS);
    const total = result.spontaneous + result.model + result.phoneticCue + result.directCorrection;
    expect(total).toBe(100);
  });
});
```

- [ ] **Step 2.2: Run to verify failure**

```bash
npx vitest run src/features/speech-coach/lib/__tests__/analysis-compute.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 2.3: Create analysis-compute.ts**

Create `src/features/speech-coach/lib/analysis-compute.ts`:

```typescript
type RawAttempt = {
  targetLabel: string;
  outcome: "correct" | "approximate" | "incorrect" | "no_response";
  retryCount: number;
  timestampMs: number;
};

export type CueDistribution = {
  spontaneous: number;  // % with retryCount = 0
  model: number;        // % with retryCount = 1
  phoneticCue: number;  // % with retryCount = 2
  directCorrection: number; // % with retryCount >= 3
};

/**
 * Compute cue level distribution from raw attempt data.
 * Cue level mapping: 0 = spontaneous, 1 = model, 2 = phonetic cue, 3+ = direct correction.
 * Returns percentages rounded to nearest integer; sums to 100 for non-empty input.
 */
export function computeCueDistribution(attempts: RawAttempt[]): CueDistribution {
  if (attempts.length === 0) {
    return { spontaneous: 0, model: 0, phoneticCue: 0, directCorrection: 0 };
  }
  const counts = { spontaneous: 0, model: 0, phoneticCue: 0, directCorrection: 0 };
  for (const a of attempts) {
    if (a.retryCount === 0) counts.spontaneous++;
    else if (a.retryCount === 1) counts.model++;
    else if (a.retryCount === 2) counts.phoneticCue++;
    else counts.directCorrection++;
  }
  const total = attempts.length;
  return {
    spontaneous: Math.round((counts.spontaneous / total) * 100),
    model: Math.round((counts.model / total) * 100),
    phoneticCue: Math.round((counts.phoneticCue / total) * 100),
    directCorrection: Math.round((counts.directCorrection / total) * 100),
  };
}
```

- [ ] **Step 2.4: Run tests to verify they pass**

```bash
npx vitest run src/features/speech-coach/lib/__tests__/analysis-compute.test.ts 2>&1 | tail -10
```

Expected: PASS — 6 tests.

- [ ] **Step 2.5: Commit**

```bash
git add src/features/speech-coach/lib/analysis-compute.ts \
        src/features/speech-coach/lib/__tests__/analysis-compute.test.ts
git commit -m "feat(speech-coach): add computeCueDistribution helper from rawAttempts"
```

---

## Task 3: Update saveProgress + add practice frequency queries

**Files:**
- Modify: `convex/speechCoach.ts`

- [ ] **Step 3.1: Update saveProgress to accept new fields**

In `convex/speechCoach.ts`, in the `saveProgress` internalMutation, add the new args after `insights`:

```typescript
    insights: v.optional(insightsValidator),
    // New fields from Plan 3:
    cueDistribution: v.optional(v.object({
      spontaneous: v.number(),
      model: v.number(),
      phoneticCue: v.number(),
      directCorrection: v.number(),
    })),
    positionAccuracy: v.optional(v.array(v.object({
      sound: v.string(),
      position: v.union(
        v.literal("initial"),
        v.literal("medial"),
        v.literal("final"),
        v.literal("unknown")
      ),
      correct: v.number(),
      total: v.number(),
    }))),
    iepNoteDraft: v.optional(v.string()),
```

In the handler, add the new fields to both the `ctx.db.patch` and `ctx.db.insert` calls:

```typescript
    // In the existing patch:
    await ctx.db.patch(existing._id, {
      transcriptTurns: args.transcriptTurns,
      scoreCards: args.scoreCards,
      insights: args.insights,
      cueDistribution: args.cueDistribution,   // ← add
      positionAccuracy: args.positionAccuracy, // ← add
      iepNoteDraft: args.iepNoteDraft,         // ← add
      soundsAttempted: args.soundsAttempted,
      overallEngagement: args.overallEngagement,
      recommendedNextFocus: args.recommendedNextFocus,
      summary: args.summary,
      analyzedAt: args.analyzedAt,
    });

    // In the insert:
    await ctx.db.insert("speechCoachProgress", {
      sessionId: args.sessionId,
      patientId: args.patientId,
      caregiverUserId: args.caregiverUserId,
      userId: args.userId,
      transcriptTurns: args.transcriptTurns,
      scoreCards: args.scoreCards,
      insights: args.insights,
      cueDistribution: args.cueDistribution,   // ← add
      positionAccuracy: args.positionAccuracy, // ← add
      iepNoteDraft: args.iepNoteDraft,         // ← add
      soundsAttempted: args.soundsAttempted,
      overallEngagement: args.overallEngagement,
      recommendedNextFocus: args.recommendedNextFocus,
      summary: args.summary,
      analyzedAt: args.analyzedAt,
    });
```

- [ ] **Step 3.2: Add getPracticeFrequency query**

At the bottom of `convex/speechCoach.ts`, add:

```typescript
export const getPracticeFrequency = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const allSessions = await ctx.db
      .query("speechCoachSessions")
      .withIndex("by_patientId_startedAt", (q) =>
        q.eq("patientId", args.patientId).gte("startedAt", thirtyDaysAgo)
      )
      .collect();

    const completedSessions = allSessions.filter(
      (s) => s.status === "analyzed" || s.status === "completed"
    );

    const last7 = completedSessions.filter(
      (s) => (s.startedAt ?? 0) >= sevenDaysAgo
    );
    const last30 = completedSessions;
    const avgPerWeek = last30.length > 0 ? Math.round((last30.length / 30) * 7 * 10) / 10 : 0;

    const lastSession = completedSessions[completedSessions.length - 1];
    return {
      last7Count: last7.length,
      last30Count: last30.length,
      avgPerWeek,
      consistencyLabel:
        avgPerWeek >= 3 ? "High" : avgPerWeek >= 1.5 ? "Medium" : "Low",
      lastSessionAt: lastSession?.endedAt ?? null,
      lastSessionSounds: lastSession?.config.targetSounds ?? [],
    };
  },
});

export const getLatestProgress = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    const records = await ctx.db
      .query("speechCoachProgress")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .first();

    return records ?? null;
  },
});
```

- [ ] **Step 3.3: Verify Convex compiles**

```bash
npx convex dev --once 2>&1 | tail -10
```

Expected: exits 0.

- [ ] **Step 3.4: Commit**

```bash
git add convex/speechCoach.ts
git commit -m "feat(convex): add cueDistribution/positionAccuracy to saveProgress; add getPracticeFrequency and getLatestProgress queries"
```

---

## Task 4: Split analysis prompt in speechCoachActions.ts

**Files:**
- Modify: `convex/speechCoachActions.ts`

- [ ] **Step 4.1: Replace buildAnalysisPrompt with two separate prompts**

In `convex/speechCoachActions.ts`, replace the `buildAnalysisPrompt` function and update the `analyzeSession` handler:

```typescript
/** Caregiver-facing analysis — always runs. Parent-friendly language, no clinical terms. */
function buildCaregiverAnalysisPrompt(
  session: Doc<"speechCoachSessions">,
  analysisInput: AnalysisInput,
): string {
  const targetSounds = session.config.targetSounds.join(", ");
  const rawTurnsContext = analysisInput.rawTranscriptTurns?.length
    ? `\nRAW TURNS:\n${JSON.stringify(analysisInput.rawTranscriptTurns, null, 2)}\n`
    : "";

  return `You are analyzing a speech practice session between an AI coach and a child. Write for the child's parent — warm, encouraging, no clinical terminology.

The session practiced these sounds: ${targetSounds}
${session.config.focusArea ? `Focus area: ${session.config.focusArea}` : ""}
${rawTurnsContext}
TRANSCRIPT:
${analysisInput.transcript}

Respond with a JSON object matching this EXACT shape (no markdown fences):
{
  "summary": "2-3 encouraging sentences for the parent. Say what sounds were practiced and give a positive observation. Never use terms like 'phoneme', 'articulation', 'percent correct', or cue level names.",
  "soundsAttempted": [{"sound": "/s/", "wordsAttempted": 8, "approximateSuccessRate": "high", "notes": "Parent-friendly note, e.g. 'Getting this sound well at the start of words'"}],
  "overallEngagement": "high",
  "recommendedNextFocus": ["/s/"],
  "homePracticeNotes": ["A simple home tip the parent can actually do, e.g. 'Point to things that start with S on your next walk'"]
}

Rules:
- approximateSuccessRate must be "high", "medium", or "low"
- overallEngagement must be "high", "medium", or "low"
- homePracticeNotes: 1-3 concrete, specific activities parents can do at home
- summary: NEVER mention accuracy numbers, percentages, cue levels, or clinical metrics`;
}

/** SLP-facing analysis — only runs when session has a patientId. Clinical language, structured metrics. */
function buildSlpAnalysisPrompt(
  session: Doc<"speechCoachSessions">,
  analysisInput: AnalysisInput,
): string {
  const targetSounds = session.config.targetSounds.join(", ");
  const rawTurnsContext = analysisInput.rawTranscriptTurns?.length
    ? `\nRAW TURNS:\n${JSON.stringify(analysisInput.rawTranscriptTurns, null, 2)}\n`
    : "";

  return `You are analyzing a speech therapy session transcript. Write for a licensed speech-language pathologist. Use clinical terminology.

Session targeted sounds: ${targetSounds}
Age range: ${session.config.ageRange}
${session.config.focusArea ? `Focus area: ${session.config.focusArea}` : ""}
${rawTurnsContext}
TRANSCRIPT:
${analysisInput.transcript}

Respond with a JSON object matching this EXACT shape (no markdown fences):
{
  "scoreCards": {
    "overall": 72,
    "productionAccuracy": 68,
    "consistency": 70,
    "cueingSupport": 55,
    "engagement": 80
  },
  "insights": {
    "strengths": ["Observable strength statement"],
    "patterns": ["Error pattern observed, e.g. final consonant deletion on /s/"],
    "notableCueingPatterns": ["Cue level observation"],
    "recommendedNextTargets": ["/s/ medial position"],
    "homePracticeNotes": ["Clinical recommendation for home carryover"]
  },
  "positionAccuracy": [
    {"sound": "/s/", "position": "initial", "correct": 9, "total": 11},
    {"sound": "/s/", "position": "medial", "correct": 4, "total": 9}
  ],
  "errorPatterns": ["Pattern 1", "Pattern 2"],
  "iepNoteDraft": "Student produced /s/ in initial position with X% accuracy across N trials. [Continue with clinical observations. Max 3 sentences.]"
}

Rules:
- scoreCards: all values 0-100 integers
- positionAccuracy: include each sound/position combination attempted; position must be "initial", "medial", "final", or "unknown"
- iepNoteDraft: clinical, concise, IEP-ready. Do NOT include phrases like 'the AI noted' or 'according to the session'. Write as if you observed it.`;
}
```

- [ ] **Step 4.2: Update analyzeSession to use split prompts and raise minimum**

In `convex/speechCoachActions.ts`, in the `analyzeSession` handler, replace the analysis block:

```typescript
    // Old check:
    // if (analysisInput.transcript.trim().length < 100) {

    // New check — raise minimum and also check rawAttempts:
    const hasRawAttempts = (session.rawAttempts?.length ?? 0) >= 3;
    const hasMinTranscript = analysisInput.transcript.trim().length >= 300;

    if (!hasRawAttempts && !hasMinTranscript) {
      await ctx.runMutation(internal.speechCoach.markReviewFailed, {
        sessionId: args.sessionId,
        errorMessage: "Session too short to analyze (less than 300 chars of transcript and fewer than 3 logged attempts)",
      });
      return;
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Always: caregiver analysis
    const caregiverPrompt = buildCaregiverAnalysisPrompt(session, analysisInput);
    let caregiverResult: Pick<AnalysisResult, "summary" | "soundsAttempted" | "overallEngagement" | "recommendedNextFocus"> & { homePracticeNotes?: string[] };
    try {
      caregiverResult = await callClaude(anthropic, caregiverPrompt) as typeof caregiverResult;
    } catch (error) {
      console.error("[SpeechCoach] Caregiver analysis failed, retrying:", error);
      caregiverResult = await callClaude(anthropic, caregiverPrompt) as typeof caregiverResult;
    }

    // Only for clinical sessions with a patientId: SLP analysis
    let slpResult: Partial<AnalysisResult> = {};
    if (session.patientId) {
      const slpPrompt = buildSlpAnalysisPrompt(session, analysisInput);
      try {
        slpResult = await callClaude(anthropic, slpPrompt) as Partial<AnalysisResult>;
      } catch (error) {
        // SLP analysis failure is non-critical — caregiver view still saves
        console.warn("[SpeechCoach] SLP analysis failed (non-critical):", error);
      }
    }

    // Compute cue distribution from rawAttempts (no Claude needed)
    const { computeCueDistribution } = await import("../src/features/speech-coach/lib/analysis-compute");
    const cueDistribution = session.rawAttempts?.length
      ? computeCueDistribution(session.rawAttempts)
      : undefined;

    await ctx.runMutation(internal.speechCoach.saveProgress, {
      sessionId: args.sessionId,
      patientId: session.patientId,
      caregiverUserId: session.caregiverUserId,
      userId: session.userId,
      soundsAttempted: caregiverResult.soundsAttempted,
      overallEngagement: caregiverResult.overallEngagement,
      recommendedNextFocus: caregiverResult.recommendedNextFocus,
      summary: caregiverResult.summary,
      analyzedAt: Date.now(),
      transcriptTurns: slpResult.transcriptTurns,
      scoreCards: slpResult.scoreCards,
      insights: slpResult.insights
        ? { ...slpResult.insights, homePracticeNotes: caregiverResult.homePracticeNotes ?? slpResult.insights.homePracticeNotes ?? [] }
        : undefined,
      cueDistribution,
      positionAccuracy: (slpResult as any).positionAccuracy,
      iepNoteDraft: (slpResult as any).iepNoteDraft,
    });
```

Also update the `AnalysisResult` type at the top of the file to add the new fields:

```typescript
type AnalysisResult = {
  // existing fields...
  transcriptTurns?: Array<{...}>;
  scoreCards?: {...};
  insights?: {...};
  soundsAttempted: Array<{...}>;
  overallEngagement: "high" | "medium" | "low";
  recommendedNextFocus: string[];
  summary: string;
  // new fields:
  positionAccuracy?: Array<{
    sound: string;
    position: "initial" | "medial" | "final" | "unknown";
    correct: number;
    total: number;
  }>;
  iepNoteDraft?: string;
};
```

- [ ] **Step 4.3: Verify Convex compiles**

```bash
npx convex dev --once 2>&1 | tail -10
```

Expected: exits 0.

- [ ] **Step 4.4: Commit**

```bash
git add convex/speechCoachActions.ts
git commit -m "feat(speech-coach): split analysis into caregiver + SLP prompts; raise transcript minimum to 300 chars"
```

---

## Task 5: CaregiverProgressCard — parent-friendly post-session view

**Files:**
- Create: `src/features/speech-coach/components/caregiver-progress-card.tsx`
- Create: `src/features/speech-coach/components/__tests__/caregiver-progress-card.test.tsx`

- [ ] **Step 5.1: Write the failing test**

Create `src/features/speech-coach/components/__tests__/caregiver-progress-card.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CaregiverProgressCard } from "../caregiver-progress-card";

const MOCK_PROGRESS = {
  summary: "Ace had a great session today practicing S sounds!",
  soundsAttempted: [
    { sound: "/s/", wordsAttempted: 8, approximateSuccessRate: "high" as const, notes: "Getting this sound at the start of words" },
  ],
  overallEngagement: "high" as const,
  recommendedNextFocus: ["/r/"],
  insights: {
    strengths: ["Strong imitation"],
    patterns: [],
    notableCueingPatterns: [],
    recommendedNextTargets: [],
    homePracticeNotes: ["Point to S things on walks"],
  },
};

describe("CaregiverProgressCard", () => {
  it("renders the parent-friendly summary", () => {
    render(<CaregiverProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Ace had a great session today practicing S sounds!")).toBeInTheDocument();
  });

  it("shows the words practiced list", () => {
    render(<CaregiverProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Sounds practiced today")).toBeInTheDocument();
    expect(screen.getByText("/s/")).toBeInTheDocument();
  });

  it("shows home practice tip from insights", () => {
    render(<CaregiverProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Point to S things on walks")).toBeInTheDocument();
  });

  it("does NOT render any scoreCard numbers", () => {
    render(<CaregiverProgressCard progress={{ ...MOCK_PROGRESS, scoreCards: { overall: 72, productionAccuracy: 68, consistency: 70, cueingSupport: 55, engagement: 80 } as any }} />);
    expect(screen.queryByText("72")).not.toBeInTheDocument();
    expect(screen.queryByText("Accuracy")).not.toBeInTheDocument();
  });

  it("does NOT render clinical terms", () => {
    render(<CaregiverProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.queryByText(/cueing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/phoneme/i)).not.toBeInTheDocument();
  });

  it("shows recommended next session sounds", () => {
    render(<CaregiverProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("/r/")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5.2: Run to verify failure**

```bash
npx vitest run src/features/speech-coach/components/__tests__/caregiver-progress-card.test.tsx 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 5.3: Create CaregiverProgressCard**

Create `src/features/speech-coach/components/caregiver-progress-card.tsx`:

```typescript
import type { ScoreCards, TranscriptTurn } from "../lib/session-analysis";

// Accepts the same ProgressData shape as ProgressCard — renders only parent-appropriate fields.
// NEVER render scoreCards, transcript turns, or clinical insight labels in this component.
type SoundAttempt = {
  sound: string;
  wordsAttempted: number;
  approximateSuccessRate: "high" | "medium" | "low";
  notes: string;
};

type Insights = {
  strengths: string[];
  patterns: string[];
  notableCueingPatterns: string[];
  recommendedNextTargets: string[];
  homePracticeNotes: string[];
};

type ProgressData = {
  summary: string;
  soundsAttempted: SoundAttempt[];
  overallEngagement: "high" | "medium" | "low";
  recommendedNextFocus: string[];
  scoreCards?: ScoreCards;         // received but intentionally never rendered
  insights?: Insights;
  transcriptTurns?: TranscriptTurn[]; // received but intentionally never rendered
};

const ENGAGEMENT_EMOJI: Record<string, string> = {
  high: "🌟",
  medium: "👍",
  low: "💪",
};

export function CaregiverProgressCard({ progress }: { progress: ProgressData }) {
  const homePracticeTips = progress.insights?.homePracticeNotes ?? [];

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-muted/30 p-5">
      {/* Emoji + engagement */}
      <div className="flex items-center gap-2">
        <span className="text-3xl" aria-hidden="true">
          {ENGAGEMENT_EMOJI[progress.overallEngagement] ?? "👏"}
        </span>
        <p className="text-sm leading-relaxed text-foreground">{progress.summary}</p>
      </div>

      {/* Sounds practiced */}
      {progress.soundsAttempted.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="font-body text-sm font-semibold text-foreground">
            Sounds practiced today
          </h4>
          {progress.soundsAttempted.map((attempt) => (
            <div key={attempt.sound} className="flex items-start gap-3">
              <span className="font-mono text-sm font-bold text-foreground">
                {attempt.sound}
              </span>
              <span className="text-sm text-muted-foreground">{attempt.notes}</span>
            </div>
          ))}
        </div>
      )}

      {/* Home practice tips */}
      {homePracticeTips.length > 0 && (
        <div className="rounded-xl bg-primary/8 p-4">
          <h4 className="font-body text-sm font-semibold text-foreground">
            Practice at home this week
          </h4>
          <ul className="mt-2 flex flex-col gap-1.5">
            {homePracticeTips.map((tip) => (
              <li key={tip} className="text-sm text-foreground">
                • {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next session recommendation */}
      {progress.recommendedNextFocus.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground">
            Next time, the coach will focus on:
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {progress.recommendedNextFocus.map((sound) => (
              <span
                key={sound}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {sound}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5.4: Run tests to verify they pass**

```bash
npx vitest run src/features/speech-coach/components/__tests__/caregiver-progress-card.test.tsx 2>&1 | tail -10
```

Expected: PASS — 6 tests.

- [ ] **Step 5.5: Commit**

```bash
git add src/features/speech-coach/components/caregiver-progress-card.tsx \
        src/features/speech-coach/components/__tests__/caregiver-progress-card.test.tsx
git commit -m "feat(speech-coach): add CaregiverProgressCard — parent-friendly, no clinical terms"
```

---

## Task 6: SlpProgressCard — clinical view with IEP note draft

**Files:**
- Create: `src/features/speech-coach/components/slp-progress-card.tsx`
- Create: `src/features/speech-coach/components/__tests__/slp-progress-card.test.tsx`

- [ ] **Step 6.1: Write the failing test**

Create `src/features/speech-coach/components/__tests__/slp-progress-card.test.tsx`:

```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SlpProgressCard } from "../slp-progress-card";

const MOCK_PROGRESS = {
  summary: "Student practiced /s/ sounds.",
  soundsAttempted: [
    { sound: "/s/", wordsAttempted: 11, approximateSuccessRate: "high" as const, notes: "Strong initial position" },
  ],
  overallEngagement: "high" as const,
  recommendedNextFocus: ["/s/ medial"],
  scoreCards: {
    overall: 78,
    productionAccuracy: 82,
    consistency: 75,
    cueingSupport: 60,
    engagement: 88,
  },
  cueDistribution: {
    spontaneous: 38,
    model: 35,
    phoneticCue: 19,
    directCorrection: 8,
  },
  positionAccuracy: [
    { sound: "/s/", position: "initial" as const, correct: 9, total: 11 },
    { sound: "/s/", position: "medial" as const, correct: 4, total: 9 },
  ],
  iepNoteDraft: "Student produced /s/ in initial position with 82% accuracy across 11 trials.",
};

describe("SlpProgressCard", () => {
  it("renders production accuracy score", () => {
    render(<SlpProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("renders position accuracy rows", () => {
    render(<SlpProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Initial")).toBeInTheDocument();
    expect(screen.getByText("9/11")).toBeInTheDocument();
  });

  it("renders cue distribution percentages", () => {
    render(<SlpProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Spontaneous")).toBeInTheDocument();
    expect(screen.getByText("38%")).toBeInTheDocument();
  });

  it("renders the IEP note draft", () => {
    render(<SlpProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText(/82% accuracy/)).toBeInTheDocument();
  });

  it("Copy note button copies iepNoteDraft to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<SlpProgressCard progress={MOCK_PROGRESS} />);
    fireEvent.click(screen.getByText("Copy note"));
    expect(writeText).toHaveBeenCalledWith(MOCK_PROGRESS.iepNoteDraft);
  });

  it("renders without positionAccuracy or cueDistribution gracefully", () => {
    render(
      <SlpProgressCard
        progress={{ ...MOCK_PROGRESS, positionAccuracy: undefined, cueDistribution: undefined }}
      />
    );
    expect(screen.getByText("82")).toBeInTheDocument(); // still shows scoreCards
  });
});
```

- [ ] **Step 6.2: Run to verify failure**

```bash
npx vitest run src/features/speech-coach/components/__tests__/slp-progress-card.test.tsx 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 6.3: Create SlpProgressCard**

Create `src/features/speech-coach/components/slp-progress-card.tsx`:

```typescript
"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import type { ScoreCards } from "../lib/session-analysis";

type CueDistribution = {
  spontaneous: number;
  model: number;
  phoneticCue: number;
  directCorrection: number;
};

type PositionAccuracyRow = {
  sound: string;
  position: "initial" | "medial" | "final" | "unknown";
  correct: number;
  total: number;
};

type SoundAttempt = {
  sound: string;
  wordsAttempted: number;
  approximateSuccessRate: "high" | "medium" | "low";
  notes: string;
};

type Insights = {
  strengths: string[];
  patterns: string[];
  notableCueingPatterns: string[];
  recommendedNextTargets: string[];
  homePracticeNotes: string[];
};

type ProgressData = {
  summary: string;
  soundsAttempted: SoundAttempt[];
  overallEngagement: "high" | "medium" | "low";
  recommendedNextFocus: string[];
  scoreCards?: ScoreCards;
  insights?: Insights;
  cueDistribution?: CueDistribution;
  positionAccuracy?: PositionAccuracyRow[];
  iepNoteDraft?: string;
};

const POSITION_LABELS: Record<string, string> = {
  initial: "Initial",
  medial: "Medial",
  final: "Final",
  unknown: "—",
};

const RATE_STYLES = {
  high: "bg-success-container text-on-success-container",
  medium: "bg-caution-container text-on-caution-container",
  low: "bg-error-container text-on-error-container",
};

export function SlpProgressCard({ progress }: { progress: ProgressData }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!progress.iepNoteDraft) return;
    await navigator.clipboard.writeText(progress.iepNoteDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-muted/30 p-5">
      {/* Score cards */}
      {progress.scoreCards && (
        <div className="flex flex-col gap-2">
          <h4 className="font-body text-sm font-semibold text-foreground">Session Scores</h4>
          <div className="grid grid-cols-5 gap-2">
            {(
              [
                ["Overall", progress.scoreCards.overall],
                ["Accuracy", progress.scoreCards.productionAccuracy],
                ["Consistency", progress.scoreCards.consistency],
                ["Cueing", progress.scoreCards.cueingSupport],
                ["Engagement", progress.scoreCards.engagement],
              ] as [string, number][]
            ).map(([label, value]) => (
              <div key={label} className="rounded-xl bg-background p-3 text-center">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Position accuracy */}
      {progress.positionAccuracy && progress.positionAccuracy.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="font-body text-sm font-semibold text-foreground">Production by Position</h4>
          {progress.positionAccuracy.map((row) => {
            const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
            return (
              <div key={`${row.sound}-${row.position}`} className="flex items-center gap-3">
                <span className="w-16 text-xs font-mono font-semibold text-foreground">
                  {row.sound}
                </span>
                <span className="w-16 text-xs text-muted-foreground">
                  {POSITION_LABELS[row.position]}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-12 text-right text-xs font-medium text-foreground">
                  {row.correct}/{row.total}
                </span>
                <span className="w-8 text-right text-xs text-muted-foreground">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Cue distribution */}
      {progress.cueDistribution && (
        <div className="flex flex-col gap-2">
          <h4 className="font-body text-sm font-semibold text-foreground">Cue Level Distribution</h4>
          {(
            [
              ["Spontaneous", progress.cueDistribution.spontaneous],
              ["Model only", progress.cueDistribution.model],
              ["Phonetic cue", progress.cueDistribution.phoneticCue],
              ["Direct correction", progress.cueDistribution.directCorrection],
            ] as [string, number][]
          ).map(([label, pct]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-32 text-xs text-muted-foreground">{label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs font-medium text-foreground">{pct}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Clinical insights */}
      {progress.insights?.patterns && progress.insights.patterns.length > 0 && (
        <div>
          <h4 className="font-body text-sm font-semibold text-foreground">Error Patterns</h4>
          <ul className="mt-1.5 flex flex-col gap-1">
            {progress.insights.patterns.map((p) => (
              <li key={p} className="text-sm text-foreground">• {p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* IEP note draft — HIPAA: clipboard only, no external share */}
      {progress.iepNoteDraft && (
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-body text-sm font-semibold text-foreground">IEP Note (draft)</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy note"}
            </Button>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{progress.iepNoteDraft}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Review and edit before adding to official records.
          </p>
        </div>
      )}

      {/* Sounds summary row */}
      {progress.soundsAttempted.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="font-body text-sm font-semibold text-foreground">Sounds Attempted</h4>
          {progress.soundsAttempted.map((a) => (
            <div key={a.sound} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-foreground">{a.sound}</span>
                <span className="text-xs text-muted-foreground">{a.wordsAttempted} words</span>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", RATE_STYLES[a.approximateSuccessRate])}>
                {a.approximateSuccessRate}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6.4: Run tests to verify they pass**

```bash
npx vitest run src/features/speech-coach/components/__tests__/slp-progress-card.test.tsx 2>&1 | tail -10
```

Expected: PASS — 6 tests.

- [ ] **Step 6.5: Commit**

```bash
git add src/features/speech-coach/components/slp-progress-card.tsx \
        src/features/speech-coach/components/__tests__/slp-progress-card.test.tsx
git commit -m "feat(speech-coach): add SlpProgressCard with position accuracy, cue distribution, IEP note"
```

---

## Task 7: Wire CaregiverProgressCard and SlpProgressCard into existing pages

**Files:**
- Modify: `src/features/speech-coach/components/speech-coach-page.tsx`
- Modify: `src/features/speech-coach/components/session-history.tsx`

- [ ] **Step 7.1: Replace ProgressCard with CaregiverProgressCard in speech-coach-page.tsx**

In `src/features/speech-coach/components/speech-coach-page.tsx`:

1. Replace the import:
```typescript
// Remove:
import { ProgressCard } from "./progress-card";
// Add:
import { CaregiverProgressCard } from "./caregiver-progress-card";
```

2. Replace the usage in the `reviewing` phase block:
```typescript
// Before:
          <ProgressCard progress={progress} />
// After:
          <CaregiverProgressCard progress={progress} />
```

- [ ] **Step 7.2: Replace ProgressCard with SlpProgressCard in session-history.tsx**

In `src/features/speech-coach/components/session-history.tsx`:

1. Add import:
```typescript
import { SlpProgressCard } from "./slp-progress-card";
```

2. Replace the usage in `ExpandedDetail`:
```typescript
// Before:
      <ProgressCard progress={detail.progress} />
// After:
      <SlpProgressCard progress={detail.progress} />
```

Note: Keep the existing `ProgressCard` import and component unchanged — it's still used in other places and has passing tests.

- [ ] **Step 7.3: Run related tests**

```bash
npx vitest run src/features/speech-coach/components/__tests__/speech-coach-page.test.tsx \
             src/features/speech-coach/components/__tests__/session-history.test.tsx 2>&1 | tail -15
```

Expected: PASS — all existing tests.

- [ ] **Step 7.4: Commit**

```bash
git add src/features/speech-coach/components/speech-coach-page.tsx \
        src/features/speech-coach/components/session-history.tsx
git commit -m "feat(speech-coach): use CaregiverProgressCard post-session and SlpProgressCard in history"
```

---

## Task 8: CaregiverPracticePanel + SessionDotCalendar

**Files:**
- Create: `src/features/speech-coach/components/session-dot-calendar.tsx`
- Create: `src/features/speech-coach/components/__tests__/session-dot-calendar.test.tsx`
- Create: `src/features/speech-coach/components/caregiver-practice-panel.tsx`
- Create: `src/features/speech-coach/components/__tests__/caregiver-practice-panel.test.tsx`

- [ ] **Step 8.1: Write SessionDotCalendar test**

Create `src/features/speech-coach/components/__tests__/session-dot-calendar.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SessionDotCalendar } from "../session-dot-calendar";

const NOW = new Date("2026-04-02T12:00:00Z").getTime();

describe("SessionDotCalendar", () => {
  it("renders 7 day slots", () => {
    render(<SessionDotCalendar sessionTimestamps={[]} nowMs={NOW} />);
    const dots = document.querySelectorAll('[data-testid="calendar-day"]');
    expect(dots.length).toBe(7);
  });

  it("shows filled dot for a day that had a session", () => {
    const yesterday = NOW - 24 * 60 * 60 * 1000;
    render(<SessionDotCalendar sessionTimestamps={[yesterday]} nowMs={NOW} />);
    const filledDots = document.querySelectorAll('[data-filled="true"]');
    expect(filledDots.length).toBe(1);
  });

  it("shows empty dot for days without sessions", () => {
    render(<SessionDotCalendar sessionTimestamps={[]} nowMs={NOW} />);
    const emptyDots = document.querySelectorAll('[data-filled="false"]');
    expect(emptyDots.length).toBe(7);
  });
});
```

- [ ] **Step 8.2: Create SessionDotCalendar**

Create `src/features/speech-coach/components/session-dot-calendar.tsx`:

```typescript
import { cn } from "@/core/utils";

type Props = {
  sessionTimestamps: number[];
  nowMs?: number;
};

function toDateString(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { weekday: "short" });
}

function toIsoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function SessionDotCalendar({ sessionTimestamps, nowMs }: Props) {
  const now = nowMs ?? Date.now();
  const sessionDays = new Set(sessionTimestamps.map(toIsoDay));

  // Last 7 days, oldest first
  const days = Array.from({ length: 7 }, (_, i) => {
    const ms = now - (6 - i) * 24 * 60 * 60 * 1000;
    return { ms, isoDay: toIsoDay(ms), label: toDateString(ms) };
  });

  return (
    <div className="flex items-end gap-3">
      {days.map(({ ms, isoDay, label }) => {
        const hasSessions = sessionDays.has(isoDay);
        return (
          <div
            key={isoDay}
            data-testid="calendar-day"
            data-filled={String(hasSessions)}
            className="flex flex-col items-center gap-1.5"
          >
            <span
              className={cn(
                "h-3 w-3 rounded-full",
                hasSessions ? "bg-primary" : "bg-muted"
              )}
              aria-label={hasSessions ? `Session on ${label}` : `No session on ${label}`}
            />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 8.3: Write CaregiverPracticePanel test**

Create `src/features/speech-coach/components/__tests__/caregiver-practice-panel.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CaregiverPracticePanel } from "../caregiver-practice-panel";

const MOCK_LATEST_PROGRESS = {
  summary: "Ace had a great session!",
  recommendedNextFocus: ["/s/"],
  insights: { homePracticeNotes: ["Try naming S words on walks"], strengths: [], patterns: [], notableCueingPatterns: [], recommendedNextTargets: [] },
  soundsAttempted: [],
  overallEngagement: "high" as const,
  analyzedAt: Date.now() - 86400000,
};

describe("CaregiverPracticePanel", () => {
  it("shows sessions this week count", () => {
    render(
      <CaregiverPracticePanel
        sessionsThisWeek={3}
        lastProgress={MOCK_LATEST_PROGRESS}
        onStartSession={vi.fn()}
      />
    );
    expect(screen.getByText("3 sessions this week")).toBeInTheDocument();
  });

  it("shows home practice tip", () => {
    render(
      <CaregiverPracticePanel
        sessionsThisWeek={1}
        lastProgress={MOCK_LATEST_PROGRESS}
        onStartSession={vi.fn()}
      />
    );
    expect(screen.getByText("Try naming S words on walks")).toBeInTheDocument();
  });

  it("Start session button calls onStartSession", () => {
    const onStart = vi.fn();
    render(
      <CaregiverPracticePanel
        sessionsThisWeek={1}
        lastProgress={MOCK_LATEST_PROGRESS}
        onStartSession={onStart}
      />
    );
    screen.getByText("Start a session").click();
    expect(onStart).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 8.4: Create CaregiverPracticePanel**

Create `src/features/speech-coach/components/caregiver-practice-panel.tsx`:

```typescript
"use client";

import { Button } from "@/shared/components/ui/button";

type LatestProgress = {
  summary: string;
  recommendedNextFocus: string[];
  insights?: { homePracticeNotes: string[] };
  analyzedAt: number;
};

type Props = {
  sessionsThisWeek: number;
  lastProgress: LatestProgress | null;
  onStartSession: () => void;
};

function formatRelativeDate(ms: number): string {
  const diff = Date.now() - ms;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function CaregiverPracticePanel({ sessionsThisWeek, lastProgress, onStartSession }: Props) {
  const homeTip = lastProgress?.insights?.homePracticeNotes?.[0];

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-surface-container-lowest p-5">
      {/* Sessions this week */}
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">🔥</span>
        <span className="text-sm font-semibold text-foreground">
          {sessionsThisWeek} {sessionsThisWeek === 1 ? "session" : "sessions"} this week
        </span>
      </div>

      {/* Last session summary */}
      {lastProgress && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Last session:</span>{" "}
          {formatRelativeDate(lastProgress.analyzedAt)}
          {lastProgress.summary && (
            <p className="mt-1 text-sm text-foreground line-clamp-2">{lastProgress.summary}</p>
          )}
        </div>
      )}

      {/* This week's focus + Start CTA */}
      {lastProgress?.recommendedNextFocus && lastProgress.recommendedNextFocus.length > 0 && (
        <div className="rounded-xl bg-primary/8 p-3">
          <p className="text-xs font-medium text-muted-foreground">This week&apos;s focus</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {lastProgress.recommendedNextFocus.map((s) => (
              <span key={s} className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <Button
        type="button"
        onClick={onStartSession}
        className="w-full bg-gradient-to-br from-[#00595c] to-[#0d7377] font-semibold"
      >
        Start a session
      </Button>

      {/* Home practice tip */}
      {homeTip && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">Home practice tip</p>
          <p className="mt-1 text-sm text-foreground">{homeTip}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8.5: Run all new component tests**

```bash
npx vitest run \
  src/features/speech-coach/components/__tests__/session-dot-calendar.test.tsx \
  src/features/speech-coach/components/__tests__/caregiver-practice-panel.test.tsx 2>&1 | tail -15
```

Expected: PASS — 6 tests across both files.

- [ ] **Step 8.6: Commit**

```bash
git add \
  src/features/speech-coach/components/session-dot-calendar.tsx \
  src/features/speech-coach/components/__tests__/session-dot-calendar.test.tsx \
  src/features/speech-coach/components/caregiver-practice-panel.tsx \
  src/features/speech-coach/components/__tests__/caregiver-practice-panel.test.tsx
git commit -m "feat(speech-coach): add SessionDotCalendar and CaregiverPracticePanel for home practice integration"
```

---

## Task 9: SlpPracticeFrequencyPanel

**Files:**
- Create: `src/features/speech-coach/components/slp-practice-frequency-panel.tsx`
- Create: `src/features/speech-coach/components/__tests__/slp-practice-frequency-panel.test.tsx`

- [ ] **Step 9.1: Write the failing test**

Create `src/features/speech-coach/components/__tests__/slp-practice-frequency-panel.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SlpPracticeFrequencyPanel } from "../slp-practice-frequency-panel";

const MOCK_FREQUENCY = {
  last7Count: 3,
  last30Count: 8,
  avgPerWeek: 2.1,
  consistencyLabel: "Medium" as const,
  lastSessionAt: Date.now() - 86400000,
  lastSessionSounds: ["/s/", "/r/"],
};

describe("SlpPracticeFrequencyPanel", () => {
  it("shows sessions this week", () => {
    render(<SlpPracticeFrequencyPanel frequency={MOCK_FREQUENCY} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows average per week", () => {
    render(<SlpPracticeFrequencyPanel frequency={MOCK_FREQUENCY} />);
    expect(screen.getByText("2.1")).toBeInTheDocument();
  });

  it("shows consistency label", () => {
    render(<SlpPracticeFrequencyPanel frequency={MOCK_FREQUENCY} />);
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("shows last session sounds", () => {
    render(<SlpPracticeFrequencyPanel frequency={MOCK_FREQUENCY} />);
    expect(screen.getByText("/s/")).toBeInTheDocument();
  });

  it("handles null frequency gracefully", () => {
    render(<SlpPracticeFrequencyPanel frequency={null} />);
    expect(screen.getByText(/No sessions yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 9.2: Run to verify failure**

```bash
npx vitest run src/features/speech-coach/components/__tests__/slp-practice-frequency-panel.test.tsx 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 9.3: Create SlpPracticeFrequencyPanel**

Create `src/features/speech-coach/components/slp-practice-frequency-panel.tsx`:

```typescript
import Link from "next/link";

import { ROUTES } from "@/core/routes";
import { Button } from "@/shared/components/ui/button";

type FrequencyData = {
  last7Count: number;
  last30Count: number;
  avgPerWeek: number;
  consistencyLabel: "High" | "Medium" | "Low";
  lastSessionAt: number | null;
  lastSessionSounds: string[];
};

const CONSISTENCY_COLORS: Record<FrequencyData["consistencyLabel"], string> = {
  High: "text-on-success-container bg-success-container",
  Medium: "text-on-caution-container bg-caution-container",
  Low: "text-on-error-container bg-error-container",
};

function formatRelativeDate(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

type Props = {
  frequency: FrequencyData | null;
  adjustHref?: string;
};

export function SlpPracticeFrequencyPanel({ frequency, adjustHref }: Props) {
  if (!frequency) {
    return (
      <div className="rounded-xl bg-muted/20 p-4">
        <p className="text-sm text-muted-foreground">No sessions yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-body text-sm font-semibold text-foreground">Home Practice · Last 30 days</h4>
        {adjustHref && (
          <Button asChild variant="ghost" size="sm">
            <Link href={adjustHref}>Adjust →</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-background p-3 text-center">
          <p className="text-2xl font-semibold text-foreground">{frequency.last7Count}</p>
          <p className="text-xs text-muted-foreground">This week</p>
        </div>
        <div className="rounded-lg bg-background p-3 text-center">
          <p className="text-2xl font-semibold text-foreground">{frequency.avgPerWeek}</p>
          <p className="text-xs text-muted-foreground">Avg / week</p>
        </div>
        <div className="rounded-lg bg-background p-3 text-center">
          <p className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CONSISTENCY_COLORS[frequency.consistencyLabel]}`}>
            {frequency.consistencyLabel}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Consistency</p>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Last session:</span>{" "}
        {formatRelativeDate(frequency.lastSessionAt)}
        {frequency.lastSessionSounds.length > 0 && (
          <span>
            {" "}— practiced{" "}
            {frequency.lastSessionSounds.map((s) => (
              <span key={s} className="font-mono font-medium text-foreground">
                {s}{" "}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 9.4: Run tests to verify they pass**

```bash
npx vitest run src/features/speech-coach/components/__tests__/slp-practice-frequency-panel.test.tsx 2>&1 | tail -10
```

Expected: PASS — 5 tests.

- [ ] **Step 9.5: Commit**

```bash
git add src/features/speech-coach/components/slp-practice-frequency-panel.tsx \
        src/features/speech-coach/components/__tests__/slp-practice-frequency-panel.test.tsx
git commit -m "feat(speech-coach): add SlpPracticeFrequencyPanel for SLP caseload home practice view"
```

---

## Task 10: "Based on last session" label in SessionConfig

**Files:**
- Modify: `src/features/speech-coach/components/session-config.tsx`
- Modify: `src/features/speech-coach/components/__tests__/session-config.test.tsx`

- [ ] **Step 10.1: Write the failing test**

Add to `src/features/speech-coach/components/__tests__/session-config.test.tsx`:

```typescript
  it("shows 'based on last session' label when lastRecommended is provided", () => {
    render(
      <SessionConfig
        speechCoachConfig={DEFAULT_CONFIG}
        onStart={vi.fn()}
        lastRecommended={["/r/"]}
      />
    );
    expect(screen.getByText(/based on.*last session/i)).toBeInTheDocument();
  });
```

- [ ] **Step 10.2: Run to verify failure**

```bash
npx vitest run src/features/speech-coach/components/__tests__/session-config.test.tsx 2>&1 | tail -10
```

Expected: FAIL — label text not found (existing message says "Based on the last session, we recommend…" but may not exactly match the regex).

Check the existing text in session-config.tsx:

```bash
grep -n "last session" /Users/desha/Springfield-Vibeathon/src/features/speech-coach/components/session-config.tsx
```

- [ ] **Step 10.3: Update the label text to match spec**

In `src/features/speech-coach/components/session-config.tsx`, find the `lastRecommended` info paragraph and update it:

```typescript
// Replace:
        {lastRecommended && lastRecommended.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Based on the last session, we recommend practicing these sounds.
          </p>
        )}

// With:
        {lastRecommended && lastRecommended.length > 0 && (
          <p className="mt-2 text-xs font-medium text-primary">
            ✓ Based on last session&apos;s recommendation
          </p>
        )}
```

- [ ] **Step 10.4: Run tests to verify they pass**

```bash
npx vitest run src/features/speech-coach/components/__tests__/session-config.test.tsx 2>&1 | tail -10
```

Expected: PASS — all tests.

- [ ] **Step 10.5: Commit**

```bash
git add src/features/speech-coach/components/session-config.tsx \
        src/features/speech-coach/components/__tests__/session-config.test.tsx
git commit -m "feat(speech-coach): update 'based on last session' label in SessionConfig"
```

---

## Task 11: Full suite verification

- [ ] **Step 11.1: Run the full test suite**

```bash
npm test 2>&1 | tail -30
```

Expected: all existing tests pass + 30+ new tests across Tasks 2–10. Zero regressions.

- [ ] **Step 11.2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 11.3: Convex types and schema check**

```bash
npx convex dev --once 2>&1 | tail -10
```

Expected: exits 0.

---

## Self-Review Checklist

- [x] Schema: cueDistribution, positionAccuracy, iepNoteDraft added to speechCoachProgress (Task 1)
- [x] computeCueDistribution uses retryCount mapping: 0=spontaneous, 1=model, 2=phonetic, 3+=direct (Task 2)
- [x] saveProgress accepts all new fields in both patch and insert paths (Task 3)
- [x] getPracticeFrequency uses existing by_patientId_startedAt index — no new index needed (Task 3)
- [x] Caregiver analysis prompt explicitly forbids clinical terms in summary field (Task 4)
- [x] SLP analysis only runs when session.patientId is present (Task 4)
- [x] Transcript minimum raised from 100 to 300 chars; rawAttempts check is OR condition, not AND (Task 4)
- [x] CaregiverProgressCard test explicitly checks that scoreCard numbers are NOT rendered (Task 5)
- [x] SlpProgressCard IEP note copy is clipboard-only — no external share button (Task 6) — HIPAA gate
- [x] IEP note includes "Review and edit before adding to official records" disclaimer (Task 6)
- [x] ProgressCard original kept unchanged — backward compatible with existing tests (Task 7)
- [x] SessionDotCalendar uses data-testid and data-filled attributes for testability (Task 8)
- [x] CaregiverPracticePanel renders no clinical data — summary and tips only (Task 8)
- [x] SlpPracticeFrequencyPanel handles null frequency gracefully (Task 9)
- [x] "Based on last session" label uses accessible text, testable via regex (Task 10)
