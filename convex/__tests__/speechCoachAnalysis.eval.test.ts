/**
 * Eval coverage for the analyzeSession AI output contract.
 *
 * Three fixture categories:
 *   1. Happy path  — rich, well-formed Claude response → session reaches "analyzed"
 *   2. Sparse      — transcript < 100 chars → session reaches "review_failed"
 *   3. Failure     — missing ANTHROPIC_API_KEY → session reaches "review_failed"
 *
 * Every test validates the saved speechCoachProgress shape, not just the
 * session status, so the full output contract (transcriptTurns, scoreCards,
 * insights) is covered end-to-end.
 */

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { internal } from "../_generated/api";
import schema from "../schema";

const mockAnthropicCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: mockAnthropicCreate,
    };
  },
}));

const modules = import.meta.glob("../**/*.*s");

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ── helpers ──────────────────────────────────────────────────────────────────

const LONG_TRANSCRIPT = [
  "Coach: Let's practice the /s/ sound today. Can you say the word 'sun'?",
  "Child: thun.",
  "Coach: Good try! Let me show you — sun. Now you try: sun.",
  "Child: sun.",
  "Coach: Perfect! Let's try 'sat'. Can you say sat?",
  "Child: thtat.",
  "Coach: Almost! Try again — sat.",
  "Child: sat.",
  "Coach: Great job! One more — sad. Say sad.",
  "Child: thad.",
  "Coach: Keep trying, you are doing well. Sad. Sssad.",
  "Child: ssad.",
].join("\n");

/** Response for the caregiver analysis Claude call (call #1). */
function makeCaregiverAnalysisResponse() {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          soundsAttempted: [
            {
              sound: "/s/",
              wordsAttempted: 6,
              approximateSuccessRate: "medium",
              notes: "Improved with direct modeling",
            },
          ],
          overallEngagement: "high",
          recommendedNextFocus: ["/s/"],
          homePracticeNotes: ["Practice 5 /s/ words with a visual card: sun, sat, sad, sock, soap"],
          summary: "Great effort on /s/ sounds. Responds well to direct modeling and stays engaged throughout.",
        }),
      },
    ],
  };
}

/** Response for the SLP analysis Claude call (call #2, only runs when session has patientId). */
function makeSlpAnalysisResponse() {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          transcriptTurns: [
            {
              speaker: "coach",
              text: "Can you say the word 'sun'?",
              targetItemId: "sun",
              targetLabel: "sun",
              retryCount: 0,
              timestampMs: 1000,
            },
            {
              speaker: "child",
              text: "thun.",
              targetItemId: "sun",
              targetLabel: "sun",
              attemptOutcome: "incorrect",
              retryCount: 0,
              timestampMs: 2000,
            },
            {
              speaker: "coach",
              text: "Good try! sun. Now you try: sun.",
              targetItemId: "sun",
              targetLabel: "sun",
              retryCount: 1,
              timestampMs: 3000,
            },
            {
              speaker: "child",
              text: "sun.",
              targetItemId: "sun",
              targetLabel: "sun",
              attemptOutcome: "correct",
              retryCount: 1,
              timestampMs: 4000,
            },
          ],
          scoreCards: {
            overall: 74,
            productionAccuracy: 70,
            consistency: 72,
            cueingSupport: 60,
            engagement: 88,
          },
          insights: {
            strengths: ["Corrected /s/ after one model"],
            patterns: ["Consistent fronting (/s/ → /th/) on initial position"],
            notableCueingPatterns: ["Best accuracy after immediate model repetition"],
            recommendedNextTargets: ["/s/", "/z/"],
            homePracticeNotes: ["Practice 5 /s/ words with a visual card: sun, sat, sad, sock, soap"],
          },
          positionAccuracy: [
            { sound: "/s/", position: "initial", correct: 4, total: 6 },
          ],
          iepNoteDraft: "Student produced /s/ in initial position with approximately 67% accuracy across 6 trials.",
        }),
      },
    ],
  };
}

/** @deprecated Use makeCaregiverAnalysisResponse() + makeSlpAnalysisResponse() instead */
function makeFullAnalysisResponse() {
  return makeSlpAnalysisResponse();
}

async function insertAnalyzingSession(
  t: ReturnType<typeof convexTest>,
  transcriptText: string,
  opts: { withPatientId?: boolean } = {},
): Promise<{ sessionId: ReturnType<typeof t.run> extends Promise<infer T> ? T : never; transcriptStorageId: string }> {
  const transcriptStorageId = await t.run((ctx) =>
    ctx.storage.store(new Blob([transcriptText], { type: "text/plain" }))
  );

  const sessionId = await t.run(async (ctx) => {
    // Insert a dummy patient so the foreign-key reference is valid when patientId is set
    const patientId = opts.withPatientId
      ? await ctx.db.insert("patients", {
          slpUserId: "slp-eval-001",
          firstName: "Eval",
          lastName: "Patient",
          dateOfBirth: "2020-01-01",
          diagnosis: "articulation" as const,
          status: "active" as const,
        })
      : undefined;

    return ctx.db.insert("speechCoachSessions", {
      caregiverUserId: "caregiver-eval-001",
      userId: "caregiver-eval-001",
      mode: opts.withPatientId ? "clinical" : "standalone",
      agentId: "speech-coach",
      runtimeProvider: "livekit",
      status: "analyzing",
      transcriptStorageId,
      patientId,
      config: { targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 10 },
    });
  });

  return { sessionId, transcriptStorageId } as never;
}

// ── Happy path ───────────────────────────────────────────────────────────────

describe("speechCoachAnalysis eval — happy path", () => {
  it("saves full output contract when Claude returns a rich response", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    // Two Claude calls: caregiver analysis first, then SLP analysis (patientId present)
    mockAnthropicCreate
      .mockResolvedValueOnce(makeCaregiverAnalysisResponse())
      .mockResolvedValueOnce(makeSlpAnalysisResponse());

    const { sessionId } = await insertAnalyzingSession(t, LONG_TRANSCRIPT, { withPatientId: true });
    await t.action(internal.speechCoachActions.analyzeSession, { sessionId });

    const session = await t.run((ctx) => ctx.db.get(sessionId));
    expect(session?.status).toBe("analyzed");

    const progress = await t.run((ctx) =>
      ctx.db
        .query("speechCoachProgress")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
        .first()
    );
    expect(progress).not.toBeNull();
    expect(progress?.scoreCards?.overall).toBe(74);
    expect(progress?.scoreCards?.productionAccuracy).toBe(70);
    expect(progress?.transcriptTurns).toHaveLength(4);
    expect(progress?.transcriptTurns?.[1].attemptOutcome).toBe("incorrect");
    expect(progress?.transcriptTurns?.[3].attemptOutcome).toBe("correct");
    expect(progress?.insights?.strengths).toContain("Corrected /s/ after one model");
    expect(progress?.insights?.recommendedNextTargets).toEqual(["/s/", "/z/"]);
    expect(progress?.summary).toMatch(/Great effort/);
  });

  it("strips markdown fences from Claude response before parsing", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");

    // Caregiver call response (call #1) — wrapped in markdown fences to verify stripping
    const caregiverRawJson = JSON.stringify({
      soundsAttempted: [
        { sound: "/s/", wordsAttempted: 3, approximateSuccessRate: "high", notes: "Consistent" },
      ],
      overallEngagement: "high",
      recommendedNextFocus: ["/s/"],
      homePracticeNotes: ["Practice /s/ words at home"],
      summary: "Strong session with consistent /s/ production.",
    });

    // SLP call response (call #2) — also wrapped in markdown fences
    const slpRawJson = JSON.stringify({
      transcriptTurns: [
        { speaker: "coach", text: "Say sun", retryCount: 0, timestampMs: 500 },
      ],
      scoreCards: {
        overall: 80,
        productionAccuracy: 78,
        consistency: 80,
        cueingSupport: 70,
        engagement: 90,
      },
      insights: {
        strengths: ["Immediate /s/ production on first attempt"],
        patterns: [],
        notableCueingPatterns: [],
        recommendedNextTargets: ["/s/"],
        homePracticeNotes: [],
      },
      positionAccuracy: [{ sound: "/s/", position: "initial", correct: 3, total: 3 }],
      iepNoteDraft: "Student produced /s/ in initial position with 100% accuracy across 3 trials.",
    });

    mockAnthropicCreate
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "```json\n" + caregiverRawJson + "\n```" }],
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "```json\n" + slpRawJson + "\n```" }],
      });

    const { sessionId } = await insertAnalyzingSession(t, LONG_TRANSCRIPT, { withPatientId: true });
    await t.action(internal.speechCoachActions.analyzeSession, { sessionId });

    const session = await t.run((ctx) => ctx.db.get(sessionId));
    expect(session?.status).toBe("analyzed");

    const progress = await t.run((ctx) =>
      ctx.db
        .query("speechCoachProgress")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
        .first()
    );
    expect(progress?.scoreCards?.overall).toBe(80);
    expect(progress?.transcriptTurns).toHaveLength(1);
  });

  it("upserts progress idempotently — second analyzeSession patches not duplicates", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    // Standalone session (no patientId) — only caregiver analysis runs (one Claude call per analyzeSession)
    mockAnthropicCreate.mockResolvedValue(makeCaregiverAnalysisResponse());

    const { sessionId } = await insertAnalyzingSession(t, LONG_TRANSCRIPT);
    await t.action(internal.speechCoachActions.analyzeSession, { sessionId });

    // Move back to analyzing to simulate a second analysis (e.g. retry path)
    await t.run((ctx) => ctx.db.patch(sessionId, { status: "analyzing" }));
    await t.action(internal.speechCoachActions.analyzeSession, { sessionId });

    const progressRows = await t.run((ctx) =>
      ctx.db
        .query("speechCoachProgress")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
        .collect()
    );
    expect(progressRows).toHaveLength(1);
  });
});

// ── Sparse-response ──────────────────────────────────────────────────────────

describe("speechCoachAnalysis eval — sparse transcript", () => {
  it("marks session review_failed when stored transcript is shorter than 100 chars", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");

    const { sessionId } = await insertAnalyzingSession(t, "Coach: Say sun. Child: sun.");
    await t.action(internal.speechCoachActions.analyzeSession, { sessionId });

    const session = await t.run((ctx) => ctx.db.get(sessionId));
    expect(session?.status).toBe("review_failed");
    expect(session?.analysisErrorMessage).toMatch(/too short/i);

    // Anthropic should never have been called
    expect(mockAnthropicCreate).not.toHaveBeenCalled();
  });

  it("does not create a progress record for sparse transcripts", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");

    const { sessionId } = await insertAnalyzingSession(t, "Short.");
    await t.action(internal.speechCoachActions.analyzeSession, { sessionId });

    const progress = await t.run((ctx) =>
      ctx.db
        .query("speechCoachProgress")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
        .first()
    );
    expect(progress).toBeNull();
  });
});

// ── Failure / retry ──────────────────────────────────────────────────────────

describe("speechCoachAnalysis eval — failure and retry", () => {
  it("marks session review_failed when ANTHROPIC_API_KEY is missing", async () => {
    const t = convexTest(schema, modules);
    // Do NOT stub ANTHROPIC_API_KEY

    const { sessionId } = await insertAnalyzingSession(t, LONG_TRANSCRIPT);
    await t.action(internal.speechCoachActions.analyzeSession, { sessionId });

    const session = await t.run((ctx) => ctx.db.get(sessionId));
    expect(session?.status).toBe("review_failed");
    expect(session?.analysisErrorMessage).toMatch(/ANTHROPIC_API_KEY/i);
    expect(mockAnthropicCreate).not.toHaveBeenCalled();
  });

  it("marks session review_failed when Claude returns no text block", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: "" } }],
    });

    const { sessionId } = await insertAnalyzingSession(t, LONG_TRANSCRIPT);
    await t.action(internal.speechCoachActions.analyzeSession, { sessionId });

    const session = await t.run((ctx) => ctx.db.get(sessionId));
    expect(session?.status).toBe("review_failed");
  });

  it("records analysisFailedAt timestamp when transitioning to review_failed", async () => {
    const t = convexTest(schema, modules);
    const before = Date.now();
    // No API key → immediate failure path
    const { sessionId } = await insertAnalyzingSession(t, LONG_TRANSCRIPT);
    await t.action(internal.speechCoachActions.analyzeSession, { sessionId });
    const after = Date.now();

    const session = await t.run((ctx) => ctx.db.get(sessionId));
    expect(session?.status).toBe("review_failed");
    expect(session?.analysisFailedAt).toBeGreaterThanOrEqual(before);
    expect(session?.analysisFailedAt).toBeLessThanOrEqual(after);
  });
});
