import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";
import { suppressSchedulerErrors } from "./testHelpers";

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
});
