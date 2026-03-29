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
const STRANGER = { subject: "stranger-000", issuer: "clerk" };

const today = new Date().toISOString().slice(0, 10);

async function setupProgramWithCaregiver(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, {
    firstName: "Alex",
    lastName: "Smith",
    dateOfBirth: "2020-01-15",
    diagnosis: "articulation" as const,
  });
  const token = await slp.mutation(api.caregivers.createInvite, {
    patientId,
    email: "parent@test.com",
  });
  await t.withIdentity(CAREGIVER_IDENTITY).mutation(api.caregivers.acceptInvite, { token });
  const programId = await slp.mutation(api.homePrograms.create, {
    patientId,
    title: "Practice /r/ sounds",
    instructions: "Say each word on the card",
    frequency: "daily" as const,
    startDate: new Date().toISOString().slice(0, 10),
  });
  return { patientId, programId };
}

// ── practiceLog.log ──────────────────────────────────────────────────────────

describe("practiceLog.log", () => {
  it("caregiver can log practice for linked patient", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
    const logId = await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: today,
      duration: 10,
      confidence: 4,
      notes: "Went well!",
    });
    expect(logId).toBeDefined();

    // Verify the log was created with correct patientId (derived server-side)
    const logs = await caregiver.query(api.practiceLog.listByProgram, {
      homeProgramId: programId,
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].patientId).toBe(patientId);
    expect(logs[0].date).toBe(today);
    expect(logs[0].duration).toBe(10);
    expect(logs[0].confidence).toBe(4);
  });

  it("stranger cannot log practice", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupProgramWithCaregiver(t);
    await expect(
      t.withIdentity(STRANGER).mutation(api.practiceLog.log, {
        homeProgramId: programId,
        date: today,
      })
    ).rejects.toThrow();
  });

  it("logs practice-logged to activity log", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: today,
    });
    const activityLogs = await caregiver.query(api.activityLog.listByPatient, {
      patientId,
    });
    const practiceEntry = activityLogs.find(
      (l: { action: string }) => l.action === "practice-logged"
    );
    expect(practiceEntry).toBeDefined();
  });

  it("rejects confidence out of range (0 and 6)", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
    await expect(
      caregiver.mutation(api.practiceLog.log, {
        homeProgramId: programId,
        date: today,
        confidence: 0,
      })
    ).rejects.toThrow();
    await expect(
      caregiver.mutation(api.practiceLog.log, {
        homeProgramId: programId,
        date: today,
        confidence: 6,
      })
    ).rejects.toThrow();
  });

  it("rejects negative duration", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
    await expect(
      caregiver.mutation(api.practiceLog.log, {
        homeProgramId: programId,
        date: today,
        duration: -1,
      })
    ).rejects.toThrow();
  });
});

// ── practiceLog.getStreakData ─────────────────────────────────────────────────

describe("practiceLog.getStreakData", () => {
  it("returns 0 streak with no logs", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupProgramWithCaregiver(t);
    const result = await t
      .withIdentity(CAREGIVER_IDENTITY)
      .query(api.practiceLog.getStreakData, { patientId });
    expect(result.currentStreak).toBe(0);
    expect(result.weeklyPracticeDays).toBe(0);
    expect(result.weeklyTarget).toBe(7);
  });

  it("counts consecutive days for streak", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    // Log 3 consecutive days: today, yesterday, day before
    const d0 = new Date();
    const d1 = new Date();
    d1.setDate(d1.getDate() - 1);
    const d2 = new Date();
    d2.setDate(d2.getDate() - 2);

    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: d0.toISOString().slice(0, 10),
    });
    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: d1.toISOString().slice(0, 10),
    });
    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: d2.toISOString().slice(0, 10),
    });

    const result = await caregiver.query(api.practiceLog.getStreakData, {
      patientId,
    });
    expect(result.currentStreak).toBe(3);
  });

  it("gap in days resets streak", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    // Log today and 3 days ago (gap of 2 days)
    const d0 = new Date();
    const d3 = new Date();
    d3.setDate(d3.getDate() - 3);

    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: d0.toISOString().slice(0, 10),
    });
    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: d3.toISOString().slice(0, 10),
    });

    const result = await caregiver.query(api.practiceLog.getStreakData, {
      patientId,
    });
    // Only today counts since there's a gap
    expect(result.currentStreak).toBe(1);
  });

  it("multiple logs same day count as 1 streak day", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    // Log today three times
    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: today,
    });
    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: today,
    });
    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: today,
    });

    const result = await caregiver.query(api.practiceLog.getStreakData, {
      patientId,
    });
    expect(result.currentStreak).toBe(1);
  });
});

// ── practiceLog.listByPatientDateRange ───────────────────────────────────────

describe("practiceLog.listByPatientDateRange", () => {
  it("returns logs within date range", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const d0 = new Date();
    const d1 = new Date();
    d1.setDate(d1.getDate() - 1);
    const d10 = new Date();
    d10.setDate(d10.getDate() - 10);

    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: d0.toISOString().slice(0, 10),
    });
    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: d1.toISOString().slice(0, 10),
    });
    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: d10.toISOString().slice(0, 10),
    });

    const startDate = d1.toISOString().slice(0, 10);
    const endDate = d0.toISOString().slice(0, 10);

    const logs = await caregiver.query(api.practiceLog.listByPatientDateRange, {
      patientId,
      startDate,
      endDate,
    });
    expect(logs).toHaveLength(2);
  });

  it("returns empty array when no logs in range", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const logs = await caregiver.query(api.practiceLog.listByPatientDateRange, {
      patientId,
      startDate: "2020-01-01",
      endDate: "2020-01-07",
    });
    expect(logs).toHaveLength(0);
  });

  it("stranger cannot access logs", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupProgramWithCaregiver(t);
    await expect(
      t.withIdentity(STRANGER).query(api.practiceLog.listByPatientDateRange, {
        patientId,
        startDate: "2020-01-01",
        endDate: "2020-12-31",
      })
    ).rejects.toThrow();
  });
});

// ── practiceLog.listByProgram ────────────────────────────────────────────────

describe("practiceLog.listByProgram", () => {
  it("returns logs for a program", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: today,
    });

    const logs = await caregiver.query(api.practiceLog.listByProgram, {
      homeProgramId: programId,
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].homeProgramId).toBe(programId);
  });

  it("stranger cannot access logs by program", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupProgramWithCaregiver(t);
    await expect(
      t.withIdentity(STRANGER).query(api.practiceLog.listByProgram, {
        homeProgramId: programId,
      })
    ).rejects.toThrow();
  });

  it("SLP can access logs for own patient", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: today,
    });
    const slp = t.withIdentity(SLP_IDENTITY);
    const logs = await slp.query(api.practiceLog.listByProgram, {
      homeProgramId: programId,
    });
    expect(logs).toHaveLength(1);
  });
});
