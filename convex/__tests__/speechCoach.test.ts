import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "../_generated/api";
import schema from "../schema";
import { createSpeechCoachFixture,suppressSchedulerErrors } from "./testHelpers";

const mockAnthropicCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: mockAnthropicCreate,
    };
  },
}));

const modules = import.meta.glob("../**/*.*s");

suppressSchedulerErrors();

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const CAREGIVER_IDENTITY = {
  subject: "caregiver-789",
  issuer: "clerk",
  public_metadata: JSON.stringify({ role: "caregiver" }),
};

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

const today = new Date().toISOString().slice(0, 10);

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function setupSpeechCoachProgram(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId, inviteToken } = await slp.mutation(api.patients.create, {
    ...VALID_PATIENT,
    parentEmail: "parent@test.com",
  });
  // Accept caregiver invite — use inviteToken from patients.create return value
  // (caregivers.listByPatient strips inviteToken from its response)
  const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
  await caregiver.mutation(api.caregivers.acceptInvite, { token: inviteToken! });

  // Create speech-coach home program
  const programId = await slp.mutation(api.homePrograms.create, {
    patientId,
    title: "Speech Coach - /s/ sounds",
    instructions: "Practice /s/ sounds with the voice coach.",
    frequency: "daily" as const,
    startDate: today,
    type: "speech-coach",
    speechCoachConfig: {
      targetSounds: ["/s/", "/r/"],
      ageRange: "2-4" as const,
      defaultDurationMinutes: 5,
    },
  });

  return { patientId, programId };
}

// ── createSession ───────────────────────────────────────────────────────────

describe("speechCoach.createSession", () => {
  it("caregiver creates session from speech-coach home program", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupSpeechCoachProgram(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const sessionId = await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: {
        targetSounds: ["/s/"],
        ageRange: "2-4" as const,
        durationMinutes: 5,
      },
    });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session).not.toBeNull();
    expect(session?.status).toBe("configuring");
    expect(session?.patientId).toBe(patientId);
    expect(session?.homeProgramId).toBe(programId);
    expect(session?.caregiverUserId).toBe("caregiver-789");
    expect(session?.runtimeProvider).toBe("livekit");
    expect(session?.config.targetSounds).toEqual(["/s/"]);
  });

  it("rejects unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupSpeechCoachProgram(t);

    await expect(
      t.mutation(api.speechCoach.createSession, {
        homeProgramId: programId,
        config: {
          targetSounds: ["/s/"],
          ageRange: "2-4" as const,
          durationMinutes: 5,
        },
      })
    ).rejects.toThrow();
  });

  it("rejects SLP trying to create session", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupSpeechCoachProgram(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await expect(
      slp.mutation(api.speechCoach.createSession, {
        homeProgramId: programId,
        config: {
          targetSounds: ["/s/"],
          ageRange: "2-4" as const,
          durationMinutes: 5,
        },
      })
    ).rejects.toThrow();
  });

  it("accepts caregiver links stored with tokenIdentifier and preserves that identifier on the session", async () => {
    const t = convexTest(schema, modules);
    const caregiverIdentity = {
      subject: "caregiver-user-123",
      tokenIdentifier: "https://clerk.example|caregiver-user-123",
      issuer: "clerk",
      public_metadata: JSON.stringify({ role: "caregiver" }),
    };

    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, {
      ...VALID_PATIENT,
      parentEmail: "parent@test.com",
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("caregiverLinks", {
        patientId,
        caregiverUserId: caregiverIdentity.tokenIdentifier,
        email: "parent@test.com",
        inviteToken: "token-123",
        inviteStatus: "accepted",
      });
    });

    const programId = await slp.mutation(api.homePrograms.create, {
      patientId,
      title: "Speech Coach - /s/ sounds",
      instructions: "Practice /s/ sounds with the voice coach.",
      frequency: "daily" as const,
      startDate: today,
      type: "speech-coach",
      speechCoachConfig: {
        targetSounds: ["/s/", "/r/"],
        ageRange: "2-4" as const,
        defaultDurationMinutes: 5,
      },
    });

    const caregiver = t.withIdentity(caregiverIdentity);
    const sessionId = await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: {
        targetSounds: ["/s/"],
        ageRange: "2-4" as const,
        durationMinutes: 5,
      },
    });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session?.caregiverUserId).toBe(caregiverIdentity.tokenIdentifier);
  });
});

// ── startSession / endSession / failSession ─────────────────────────────────

describe("speechCoach session lifecycle", () => {
  it("startSession sets conversationId and status to active", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupSpeechCoachProgram(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const sessionId = await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: { targetSounds: ["/s/"], ageRange: "2-4" as const, durationMinutes: 5 },
    });
    await caregiver.mutation(api.speechCoach.startSession, {
      sessionId,
      conversationId: "conv_xyz789",
    });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session?.status).toBe("active");
    expect(session?.conversationId).toBe("conv_xyz789");
    expect(session?.startedAt).toBeDefined();
  });

  it("endSession sets status to analyzing", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupSpeechCoachProgram(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const sessionId = await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: { targetSounds: ["/s/"], ageRange: "2-4" as const, durationMinutes: 5 },
    });
    await caregiver.mutation(api.speechCoach.startSession, {
      sessionId,
      conversationId: "conv_xyz789",
    });
    await caregiver.mutation(api.speechCoach.endSession, { sessionId });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session?.status).toBe("analyzing");
    expect(session?.endedAt).toBeDefined();
  });

  it("failSession sets status to failed with error message", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupSpeechCoachProgram(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const sessionId = await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: { targetSounds: ["/s/"], ageRange: "2-4" as const, durationMinutes: 5 },
    });
    await caregiver.mutation(api.speechCoach.failSession, {
      sessionId,
      errorMessage: "Microphone access denied",
    });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session?.status).toBe("failed");
    expect(session?.errorMessage).toBe("Microphone access denied");
  });
});

// ── review state tests ───────────────────────────────────────────────────────

describe("speechCoach review states", () => {
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

    await t.mutation(internal.speechCoach_lifecycle.saveProgress, {
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
});

// ── createLiveSession runtime action ────────────────────────────────────────

describe("speechCoachRuntimeActions.createLiveSession", () => {
  beforeEach(() => {
    vi.stubEnv("LIVEKIT_URL", "wss://test.livekit.cloud");
  });

  it("returns a runtime session payload instead of a fixed elevenlabs signed url", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupSpeechCoachProgram(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    // Create a session to get a sessionId
    const sessionId = await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: { targetSounds: ["/s/"], ageRange: "2-4" as const, durationMinutes: 5 },
    });

    // Call the runtime action as the caregiver who owns the session
    const result = await caregiver.action(api.speechCoachRuntimeActions.createLiveSession, { sessionId });

    expect(result.roomName).toContain("speech-coach-");
    expect(result.tokenPath).toBe("/api/speech-coach/livekit-token");
    expect(result.runtime).toBe("livekit-agent");
    expect(result.roomMetadata).toContain(String(sessionId));
  });

  it("authorizes a caregiver when the session stores tokenIdentifier", async () => {
    const t = convexTest(schema, modules);
    const caregiverIdentity = {
      subject: "caregiver-user-123",
      tokenIdentifier: "https://clerk.example|caregiver-user-123",
      issuer: "clerk",
      public_metadata: JSON.stringify({ role: "caregiver" }),
    };
    const { patientId, programId } = await createSpeechCoachFixture(t, {
      slpIdentity: SLP_IDENTITY,
      caregiverIdentity,
    });
    const caregiver = t.withIdentity(caregiverIdentity);

    const sessionId = await t.run(async (ctx) => {
      return await ctx.db.insert("speechCoachSessions", {
        patientId,
        homeProgramId: programId,
        caregiverUserId: caregiverIdentity.tokenIdentifier,
        agentId: "speech-coach",
        status: "configuring",
        config: {
          targetSounds: ["/s/"],
          ageRange: "2-4",
          durationMinutes: 5,
        },
      });
    });

    const result = await caregiver.action(api.speechCoachRuntimeActions.createLiveSession, { sessionId });
    expect(result.runtime).toBe("livekit-agent");
  });
});

describe("speechCoachRuntimeActions.persistTranscript", () => {
  it("stores transcript capture, raw turns, and queues review for LiveKit sessions", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("SPEECH_COACH_RUNTIME_SECRET", "runtime-secret");

    const sessionId = await t.run((ctx) =>
      ctx.db.insert("speechCoachSessions", {
        caregiverUserId: "caregiver-789",
        userId: "caregiver-789",
        mode: "standalone",
        agentId: "speech-coach",
        runtimeProvider: "livekit",
        status: "analyzing",
        config: { targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 },
      })
    );

    await t.action(api.speechCoachRuntimeActions.persistTranscript, {
      sessionId,
      runtimeSecret: "runtime-secret",
      rawTranscript: "Coach: Say sad\nChild: sad",
      rawTranscriptTurns: [
        { speaker: "coach", text: "Say sad", timestampMs: 1000 },
        { speaker: "child", text: "sad", timestampMs: 2000 },
      ],
      capturedAt: 3000,
    });

    const session = await t.run((ctx) => ctx.db.get(sessionId));
    expect(session?.transcriptStorageId).toBeDefined();
    expect(session?.transcriptCapturedAt).toBe(3000);
    expect(session?.rawTranscriptTurns).toEqual([
      { speaker: "coach", text: "Say sad", timestampMs: 1000 },
      { speaker: "child", text: "sad", timestampMs: 2000 },
    ]);
    expect(session?.analysisAttempts).toBe(1);
  });
});

// ── queries ─────────────────────────────────────────────────────────────────

describe("speechCoach queries", () => {
  it("getSessionHistory returns sessions for patient (dual-access)", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupSpeechCoachProgram(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
    const slp = t.withIdentity(SLP_IDENTITY);

    // Create a session
    await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: { targetSounds: ["/s/"], ageRange: "2-4" as const, durationMinutes: 5 },
    });

    // Both caregiver and SLP can see it
    const caregiverHistory = await caregiver.query(api.speechCoach.getSessionHistory, { patientId });
    expect(caregiverHistory).toHaveLength(1);

    const slpHistory = await slp.query(api.speechCoach.getSessionHistory, { patientId });
    expect(slpHistory).toHaveLength(1);
  });

  it("getSessionHistory returns empty for unauthorized user", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupSpeechCoachProgram(t);
    const stranger = t.withIdentity({ subject: "stranger-000", issuer: "clerk" });

    await expect(
      stranger.query(api.speechCoach.getSessionHistory, { patientId })
    ).rejects.toThrow();
  });

  it("keeps session history readable after template-backed runtime changes", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupSpeechCoachProgram(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    // Create a session that includes a runtimeSnapshot (simulates template-backed runtime)
    const sessionId = await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: {
        targetSounds: ["/s/", "/r/"],
        ageRange: "2-4" as const,
        durationMinutes: 5,
        runtimeSnapshot: {
          templateVersion: 2,
          voiceProvider: "elevenlabs",
          voiceKey: "eleven_flash_v2_5",
          tools: ["pronunciation-check", "encouragement"],
          skills: ["articulation"],
          knowledgePackIds: ["kp_abc123"],
        },
      },
    });

    // getSessionDetail should return both session and progress (null progress is fine)
    const detail = await caregiver.query(api.speechCoach.getSessionDetail, { sessionId });

    expect(detail).not.toBeNull();
    expect(detail.session).toBeDefined();
    expect(detail.session._id).toBe(sessionId);
    // runtimeSnapshot fields should be accessible via optional chaining
    expect(detail.session.config.runtimeSnapshot?.templateVersion).toBe(2);
    expect(detail.session.config.runtimeSnapshot?.voiceProvider).toBe("elevenlabs");
    expect(detail.session.config.runtimeSnapshot?.voiceKey).toBe("eleven_flash_v2_5");
    expect(detail.session.config.runtimeSnapshot?.tools).toEqual(["pronunciation-check", "encouragement"]);
    expect(detail.session.config.runtimeSnapshot?.skills).toEqual(["articulation"]);
    // progress is null until session is analyzed — that's expected
    expect(detail.progress).toBeNull();

    // Also verify a legacy session (no runtimeSnapshot) still returns cleanly
    const legacySessionId = await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: {
        targetSounds: ["/l/"],
        ageRange: "5-7" as const,
        durationMinutes: 10,
        // no runtimeSnapshot — legacy session
      },
    });

    const legacyDetail = await caregiver.query(api.speechCoach.getSessionDetail, { sessionId: legacySessionId });
    expect(legacyDetail.session).toBeDefined();
    expect(legacyDetail.session.config.runtimeSnapshot).toBeUndefined();
  });
});

// ── getSessionDetail PHI guard — rawAttempts ────────────────────────────────

describe("speechCoach.getSessionDetail rawAttempts PHI guard", () => {
  it("omits rawAttempts for caregiver callers", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupSpeechCoachProgram(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const sessionId = await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: { targetSounds: ["/s/"], ageRange: "2-4" as const, durationMinutes: 5 },
    });

    // Inject rawAttempts directly (simulates data written by the runtime agent)
    await t.run(async (ctx) => {
      await ctx.db.patch(sessionId, {
        rawAttempts: [
          { targetLabel: "sad", outcome: "correct", retryCount: 0, timestampMs: 1000 },
        ],
      });
    });

    const detail = await caregiver.query(api.speechCoach.getSessionDetail, { sessionId });
    expect(detail.session.rawAttempts).toBeUndefined();
  });

  it("includes rawAttempts for SLP callers", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupSpeechCoachProgram(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
    const slp = t.withIdentity(SLP_IDENTITY);

    const sessionId = await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: { targetSounds: ["/s/"], ageRange: "2-4" as const, durationMinutes: 5 },
    });

    // Inject rawAttempts directly
    await t.run(async (ctx) => {
      await ctx.db.patch(sessionId, {
        rawAttempts: [
          { targetLabel: "sad", outcome: "correct", retryCount: 0, timestampMs: 1000 },
          { targetLabel: "sun", outcome: "incorrect", retryCount: 1, timestampMs: 2000 },
        ],
      });
    });

    const detail = await slp.query(api.speechCoach.getSessionDetail, { sessionId });
    expect(detail.session.rawAttempts).toHaveLength(2);
    expect(detail.session.rawAttempts![0].targetLabel).toBe("sad");
  });
});

// ── review failure / retry states ───────────────────────────────────────────

describe("speechCoach markReviewFailed / retryReview", () => {
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

    await t.mutation(internal.speechCoach_lifecycle.markReviewFailed, {
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
});

describe("speechCoachActions.analyzeSession", () => {
  it("loads stored transcript for LiveKit sessions instead of calling ElevenLabs", async () => {
    const t = convexTest(schema, modules);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            transcriptTurns: [
              {
                speaker: "coach",
                text: "Say sad",
                retryCount: 0,
                timestampMs: 1000,
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
              strengths: ["Strong participation"],
              patterns: ["Needed one reminder"],
              notableCueingPatterns: ["Did best after direct model"],
              recommendedNextTargets: ["/s/"],
              homePracticeNotes: ["Practice five /s/ words"],
            },
            soundsAttempted: [
              {
                sound: "/s/",
                wordsAttempted: 4,
                approximateSuccessRate: "medium",
                notes: "Improved with modeling",
              },
            ],
            overallEngagement: "high",
            recommendedNextFocus: ["/s/"],
            summary: "Strong effort with improving /s/ productions.",
          }),
        },
      ],
    });

    const transcriptStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob([[
        "Coach: Say sad.",
        "Child: sad.",
        "Coach: Say sad again and stretch the /s/ sound.",
        "Child: sssad.",
        "Coach: Nice correction. Let's do three more /s/ words together.",
      ].join(" ")], { type: "text/plain" }))
    );

    const sessionId = await t.run((ctx) =>
      ctx.db.insert("speechCoachSessions", {
        caregiverUserId: "caregiver-789",
        userId: "caregiver-789",
        mode: "standalone",
        agentId: "speech-coach",
        runtimeProvider: "livekit",
        status: "analyzing",
        transcriptStorageId,
        rawAttempts: [
          { targetLabel: "sad", outcome: "correct", retryCount: 0, timestampMs: 1000 },
          { targetLabel: "sun", outcome: "approximate", retryCount: 1, timestampMs: 2000 },
          { targetLabel: "sock", outcome: "correct", retryCount: 0, timestampMs: 3000 },
        ],
        rawTranscriptTurns: [
          { speaker: "coach", text: "Say sad", timestampMs: 1000 },
          { speaker: "child", text: "sad", timestampMs: 2000 },
        ],
        config: { targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 },
      })
    );

    await t.action(internal.speechCoachActions.analyzeSession, { sessionId });

    expect(fetchSpy).not.toHaveBeenCalled();

    const session = await t.run((ctx) => ctx.db.get(sessionId));
    const progress = await t.run((ctx) =>
      ctx.db.query("speechCoachProgress").withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId)).first()
    );
    expect(session?.status).toBe("analyzed");
    expect(progress?.summary).toContain("Strong effort");
    expect(progress?.transcriptTurns).toBeUndefined();
  });

  it("keeps the legacy ElevenLabs fetch path for explicit elevenlabs sessions", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("ELEVENLABS_API_KEY", "test-elevenlabs-key");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            transcriptTurns: [],
            scoreCards: {
              overall: 65,
              productionAccuracy: 60,
              consistency: 62,
              cueingSupport: 55,
              engagement: 82,
            },
            insights: {
              strengths: ["Stayed engaged"],
              patterns: ["Needed frequent repetition"],
              notableCueingPatterns: ["Immediate model helped"],
              recommendedNextTargets: ["/r/"],
              homePracticeNotes: ["Keep sessions short"],
            },
            soundsAttempted: [
              {
                sound: "/r/",
                wordsAttempted: 3,
                approximateSuccessRate: "medium",
                notes: "Improved gradually",
              },
            ],
            overallEngagement: "medium",
            recommendedNextFocus: ["/r/"],
            summary: "Legacy summary",
          }),
        },
      ],
    });
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        transcript: [
          { role: "assistant", text: "Say red" },
          { role: "user", text: "wed" },
          { role: "assistant", text: "Try red again" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const sessionId = await t.run((ctx) =>
      ctx.db.insert("speechCoachSessions", {
        caregiverUserId: "caregiver-789",
        userId: "caregiver-789",
        mode: "standalone",
        agentId: "speech-coach",
        runtimeProvider: "elevenlabs",
        conversationId: "conv_legacy_123",
        status: "analyzing",
        analysisAttempts: 1,
        rawAttempts: [
          { targetLabel: "red", outcome: "incorrect", retryCount: 1, timestampMs: 1000 },
          { targetLabel: "rope", outcome: "approximate", retryCount: 1, timestampMs: 2000 },
          { targetLabel: "rain", outcome: "correct", retryCount: 0, timestampMs: 3000 },
        ],
        config: { targetSounds: ["/r/"], ageRange: "5-7", durationMinutes: 5 },
      })
    );

    await t.action(internal.speechCoachActions.analyzeSession, { sessionId });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const session = await t.run((ctx) => ctx.db.get(sessionId));
    expect(session?.transcriptStorageId).toBeDefined();
    expect(session?.status).toBe("analyzed");
  });

  it("returns stored transcript text for authorized users", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupSpeechCoachProgram(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const sessionId = await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: { targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 },
    });
    const transcriptStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["Coach: Say sad\nChild: sad"], { type: "text/plain" }))
    );
    await t.mutation(internal.speechCoach_lifecycle.saveRuntimeTranscriptCapture, {
      sessionId,
      storageId: transcriptStorageId,
      capturedAt: 4000,
      rawTranscriptTurns: [
        { speaker: "coach", text: "Say sad", timestampMs: 1000 },
        { speaker: "child", text: "sad", timestampMs: 2000 },
      ],
      queueForAnalysis: false,
    });

    const result = await caregiver.action(api.speechCoachActions.getTranscriptText, { sessionId });
    expect(result.transcript).toBe("Coach: Say sad\nChild: sad");

    const stranger = t.withIdentity({ subject: "stranger-000", issuer: "clerk" });
    await expect(
      stranger.action(api.speechCoachActions.getTranscriptText, { sessionId })
    ).rejects.toThrow();
  });
});

// ── shared fixtures ──────────────────────────────────────────────────────────

describe("shared fixtures", () => {
  it("creates a speech coach home program from shared fixtures", async () => {
    const t = convexTest(schema, modules);
    const fixture = await createSpeechCoachFixture(t, {
      slpIdentity: SLP_IDENTITY,
      caregiverIdentity: CAREGIVER_IDENTITY,
    });

    expect(fixture.patientId).toBeTruthy();
    expect(fixture.programId).toBeTruthy();
    const patient = await t.run((ctx) => ctx.db.get(fixture.patientId));
    expect(patient?.testMetadata).toBeUndefined();
  });
});

describe("shared helpers integration", () => {
  it("creates speech coach fixtures through shared helpers", async () => {
    const t = convexTest(schema, modules);
    const fixture = await createSpeechCoachFixture(t, {
      slpIdentity: SLP_IDENTITY,
      caregiverIdentity: CAREGIVER_IDENTITY,
    });

    expect(fixture.programId).toBeTruthy();
  });
});
