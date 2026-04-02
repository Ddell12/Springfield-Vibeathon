import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";
import { suppressSchedulerErrors } from "./testHelpers";

const modules = import.meta.glob("../**/*.*s");

suppressSchedulerErrors();

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };
// Note: public_metadata is JSON.stringify'd to match how convex-test surfaces Clerk custom claims
const CAREGIVER_IDENTITY = { subject: "caregiver-789", issuer: "clerk", public_metadata: JSON.stringify({ role: "caregiver" }) };
const STRANGER = { subject: "stranger-000", issuer: "clerk" };

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

const today = new Date().toISOString().slice(0, 10);

const VALID_PROGRAM = {
  title: "Daily /r/ Practice",
  instructions: "Practice /r/ sounds in initial position of words for 10 minutes daily.",
  frequency: "daily" as const,
  startDate: today,
};

async function createPatientWithCaregiver(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
  const token = await slp.mutation(api.caregivers.createInvite, { patientId, email: "parent@test.com" });
  const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
  await caregiver.mutation(api.caregivers.acceptInvite, { token });
  return { patientId, token };
}

// ── schema foundation ────────────────────────────────────────────────────────

describe("schema and auth foundation", () => {
  it("homePrograms table exists in schema", () => {
    expect(schema.tables.homePrograms).toBeDefined();
    expect(schema.tables.practiceLog).toBeDefined();
    expect(schema.tables.patientMessages).toBeDefined();
  });
});

// ── homePrograms.create ──────────────────────────────────────────────────────

describe("homePrograms.create", () => {
  it("creates program with correct fields and status=active", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const programId = await slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM });
    const programs = await slp.query(api.homePrograms.listByPatient, { patientId });
    const program = programs.find((p: { _id: typeof programId }) => p._id === programId);
    expect(program).toBeDefined();
    expect(program.status).toBe("active");
    expect(program.slpUserId).toBe("slp-user-123");
    expect(program.title).toBe("Daily /r/ Practice");
    expect(program.frequency).toBe("daily");
  });

  it("rejects non-owner SLP", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.withIdentity(OTHER_SLP).mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM })
    ).rejects.toThrow();
  });

  it("rejects caregiver creating program", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithCaregiver(t);
    await expect(
      t.withIdentity(CAREGIVER_IDENTITY).mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM })
    ).rejects.toThrow();
  });

  it("logs home-program-assigned to activity log", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    await slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM });
    const logs = await slp.query(api.activityLog.listByPatient, { patientId });
    const logEntry = logs.find((l: { action: string }) => l.action === "home-program-assigned");
    expect(logEntry).toBeDefined();
  });

  it("rejects empty title", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM, title: "" })
    ).rejects.toThrow("Title must be 1-200 characters");
  });

  it("rejects empty instructions", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM, instructions: "" })
    ).rejects.toThrow("Instructions must be 1-2000 characters");
  });
});

// ── homePrograms.listByPatient ───────────────────────────────────────────────

describe("homePrograms.listByPatient", () => {
  it("SLP sees own patient programs", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    await slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM });
    const programs = await slp.query(api.homePrograms.listByPatient, { patientId });
    expect(programs).toHaveLength(1);
  });

  it("caregiver sees linked patient programs", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithCaregiver(t);
    const slp = t.withIdentity(SLP_IDENTITY);
    await slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM });
    const programs = await t.withIdentity(CAREGIVER_IDENTITY).query(api.homePrograms.listByPatient, { patientId });
    expect(programs).toHaveLength(1);
  });

  it("stranger gets rejected", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.withIdentity(STRANGER).query(api.homePrograms.listByPatient, { patientId })
    ).rejects.toThrow();
  });
});

// ── homePrograms.getActiveByPatient ──────────────────────────────────────────

describe("homePrograms.getActiveByPatient", () => {
  it("returns only active programs", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);

    // Create two programs
    const p1 = await slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM });
    await slp.mutation(api.homePrograms.create, {
      patientId,
      ...VALID_PROGRAM,
      title: "Weekly Language Activities",
      frequency: "weekly" as const,
    });

    // Pause the first one
    await slp.mutation(api.homePrograms.update, { id: p1, status: "paused" as const });

    // Only 1 should be active
    const active = await slp.query(api.homePrograms.getActiveByPatient, { patientId });
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe("Weekly Language Activities");
  });
});

// ── homePrograms.update ──────────────────────────────────────────────────────

describe("homePrograms.update", () => {
  it("SLP can update fields", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const id = await slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM });
    await slp.mutation(api.homePrograms.update, {
      id,
      title: "Updated Title",
      frequency: "3x-week" as const,
    });
    const programs = await slp.query(api.homePrograms.listByPatient, { patientId });
    const updated = programs.find((p: { _id: typeof id }) => p._id === id);
    expect(updated.title).toBe("Updated Title");
    expect(updated.frequency).toBe("3x-week");
  });

  it("status change from active to paused works", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const id = await slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM });
    await slp.mutation(api.homePrograms.update, { id, status: "paused" as const });
    const programs = await slp.query(api.homePrograms.listByPatient, { patientId });
    const updated = programs.find((p: { _id: typeof id }) => p._id === id);
    expect(updated.status).toBe("paused");
  });

  it("rejects non-owner SLP update", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const id = await slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM });
    await expect(
      t.withIdentity(OTHER_SLP).mutation(api.homePrograms.update, { id, title: "Hack" })
    ).rejects.toThrow();
  });
});

// ── speech-coach type ───────────────────────────────────────────────────────

describe("homePrograms.create — speech-coach type", () => {
  it("creates speech-coach program with config", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const programId = await slp.mutation(api.homePrograms.create, {
      patientId,
      ...VALID_PROGRAM,
      title: "Speech Coach - /s/ sounds",
      instructions: "Practice /s/ sounds with the speech coach.",
      type: "speech-coach",
      speechCoachConfig: {
        targetSounds: ["/s/", "/z/"],
        ageRange: "2-4" as const,
        defaultDurationMinutes: 5,
      },
    });
    const programs = await slp.query(api.homePrograms.listByPatient, { patientId });
    const program = programs.find((p: { _id: typeof programId }) => p._id === programId);
    expect(program).toBeDefined();
    expect(program.type).toBe("speech-coach");
    expect(program.speechCoachConfig.targetSounds).toEqual(["/s/", "/z/"]);
    expect(program.speechCoachConfig.ageRange).toBe("2-4");
    expect(program.speechCoachConfig.defaultDurationMinutes).toBe(5);
  });

  it("rejects speech-coach type without speechCoachConfig", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      slp.mutation(api.homePrograms.create, {
        patientId,
        ...VALID_PROGRAM,
        type: "speech-coach",
      })
    ).rejects.toThrow("speechCoachConfig is required");
  });

  it("rejects speechCoachConfig on standard type", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      slp.mutation(api.homePrograms.create, {
        patientId,
        ...VALID_PROGRAM,
        type: "standard",
        speechCoachConfig: {
          targetSounds: ["/s/"],
          ageRange: "2-4" as const,
          defaultDurationMinutes: 5,
        },
      })
    ).rejects.toThrow("speechCoachConfig is only valid");
  });

  it("standard program without type field still works (backward compat)", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const programId = await slp.mutation(api.homePrograms.create, {
      patientId,
      ...VALID_PROGRAM,
    });
    const programs = await slp.query(api.homePrograms.listByPatient, { patientId });
    const program = programs.find((p: { _id: typeof programId }) => p._id === programId);
    expect(program).toBeDefined();
    expect(program.type).toBeUndefined();
    expect(program.speechCoachConfig).toBeUndefined();
  });
});

// ── homePrograms.listActiveSpeechCoachByPatient ──────────────────────────────

describe("homePrograms.listActiveSpeechCoachByPatient", () => {
  it("returns only speech-coach type programs", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);

    // Create a standard program
    await slp.mutation(api.homePrograms.create, {
      patientId,
      ...VALID_PROGRAM,
      title: "Standard handout",
      type: "standard",
    });

    // Create a speech-coach program
    await slp.mutation(api.homePrograms.create, {
      patientId,
      ...VALID_PROGRAM,
      title: "Speech Coach - /s/ sounds",
      instructions: "Practice /s/ sounds.",
      type: "speech-coach",
      speechCoachConfig: {
        targetSounds: ["/s/"],
        ageRange: "5-7" as const,
        defaultDurationMinutes: 10,
      },
    });

    const speechPrograms = await slp.query(
      api.homePrograms.listActiveSpeechCoachByPatient,
      { patientId }
    );

    expect(speechPrograms).toHaveLength(1);
    expect(speechPrograms[0].title).toBe("Speech Coach - /s/ sounds");
    expect(speechPrograms[0].type).toBe("speech-coach");
  });

  it("returns empty array when no speech-coach programs exist", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);

    await slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM });

    const speechPrograms = await slp.query(
      api.homePrograms.listActiveSpeechCoachByPatient,
      { patientId }
    );

    expect(speechPrograms).toHaveLength(0);
  });
});
