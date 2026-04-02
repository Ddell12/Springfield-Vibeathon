import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";
import { createSpeechCoachFixture,suppressSchedulerErrors } from "./testHelpers";

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

  it("endSession sets status to completed", async () => {
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
    expect(session?.status).toBe("completed");
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
