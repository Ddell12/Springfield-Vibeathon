import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "https://test.convex.dev" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "https://test.convex.dev" };

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

const today = new Date().toISOString().slice(0, 10);

const VALID_GOAL = {
  domain: "articulation" as const,
  shortDescription: "Produce /r/ in initial position",
  fullGoalText: "Alex will produce /r/ in the initial position of words with 80% accuracy across 3 consecutive sessions.",
  targetAccuracy: 80,
  targetConsecutiveSessions: 3,
  startDate: today,
};

async function createPatientAndGoal(
  t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  goalOverrides?: Partial<typeof VALID_GOAL>,
) {
  const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
  const goalId = await t.mutation(api.goals.create, {
    patientId,
    ...VALID_GOAL,
    ...goalOverrides,
  });
  return { patientId, goalId };
}

// ── create ──────────────────────────────────────────────────────────────────

describe("goals.create", () => {
  it("creates goal with correct fields and status=active", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await createPatientAndGoal(t);
    const goal = await t.query(api.goals.get, { goalId });
    expect(goal.status).toBe("active");
    expect(goal.slpUserId).toBe("slp-user-123");
    expect(goal.domain).toBe("articulation");
    expect(goal.targetAccuracy).toBe(80);
  });

  it("rejects empty shortDescription", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.mutation(api.goals.create, { patientId, ...VALID_GOAL, shortDescription: "" })
    ).rejects.toThrow("Short description must be 1-200 characters");
  });

  it("rejects shortDescription over 200 chars", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.mutation(api.goals.create, { patientId, ...VALID_GOAL, shortDescription: "x".repeat(201) })
    ).rejects.toThrow("Short description must be 1-200 characters");
  });

  it("rejects targetAccuracy outside 1-100", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.mutation(api.goals.create, { patientId, ...VALID_GOAL, targetAccuracy: 0 })
    ).rejects.toThrow("Target accuracy must be between 1 and 100");
    await expect(
      t.mutation(api.goals.create, { patientId, ...VALID_GOAL, targetAccuracy: 101 })
    ).rejects.toThrow("Target accuracy must be between 1 and 100");
  });

  it("rejects targetConsecutiveSessions outside 1-10", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.mutation(api.goals.create, { patientId, ...VALID_GOAL, targetConsecutiveSessions: 0 })
    ).rejects.toThrow("Target consecutive sessions must be between 1 and 10");
  });

  it("rejects access to another SLP's patient", async () => {
    const base = convexTest(schema, modules);
    const t1 = base.withIdentity(SLP_IDENTITY);
    const { patientId } = await t1.mutation(api.patients.create, VALID_PATIENT);
    const t2 = base.withIdentity(OTHER_SLP);
    await expect(
      t2.mutation(api.goals.create, { patientId, ...VALID_GOAL })
    ).rejects.toThrow("Not authorized");
  });

  it("logs goal-created to activityLog", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatientAndGoal(t);
    const logs = await t.query(api.activityLog.listByPatient, { patientId });
    const goalLog = logs.find((l: { action: string }) => l.action === "goal-created");
    expect(goalLog).toBeDefined();
  });
});

// ── list / listActive ───────────────────────────────────────────────────────

describe("goals.list and listActive", () => {
  it("returns all goals for a patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await t.mutation(api.goals.create, { patientId, ...VALID_GOAL });
    await t.mutation(api.goals.create, {
      patientId,
      ...VALID_GOAL,
      domain: "fluency" as const,
      shortDescription: "Reduce disfluencies",
    });
    const all = await t.query(api.goals.list, { patientId });
    expect(all).toHaveLength(2);
  });

  it("listActive filters to active only", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await createPatientAndGoal(t);
    await t.mutation(api.goals.update, { goalId, status: "discontinued" as const });
    const active = await t.query(api.goals.listActive, { patientId });
    expect(active).toHaveLength(0);
  });
});

// ── update ──────────────────────────────────────────────────────────────────

describe("goals.update", () => {
  it("updates fields on active goal", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await createPatientAndGoal(t);
    await t.mutation(api.goals.update, { goalId, targetAccuracy: 90 });
    const goal = await t.query(api.goals.get, { goalId });
    expect(goal.targetAccuracy).toBe(90);
  });

  it("cannot edit met goal without status change", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await createPatientAndGoal(t);
    await t.mutation(api.goals.update, { goalId, status: "met" as const });
    await expect(
      t.mutation(api.goals.update, { goalId, targetAccuracy: 90 })
    ).rejects.toThrow("Cannot edit a met goal");
  });

  it("can change met goal to modified", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await createPatientAndGoal(t);
    await t.mutation(api.goals.update, { goalId, status: "met" as const });
    await t.mutation(api.goals.update, { goalId, status: "modified" as const });
    const goal = await t.query(api.goals.get, { goalId });
    expect(goal.status).toBe("modified");
  });

  it("logs goal-met on status change to met", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await createPatientAndGoal(t);
    await t.mutation(api.goals.update, { goalId, status: "met" as const });
    const logs = await t.query(api.activityLog.listByPatient, { patientId });
    const metLog = logs.find((l: { action: string }) => l.action === "goal-met");
    expect(metLog).toBeDefined();
  });

  it("snapshots current state to amendmentLog before update", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await createPatientAndGoal(t);

    // First update — changes accuracy
    await t.mutation(api.goals.update, {
      goalId,
      targetAccuracy: 90,
      amendmentReason: "Adjusted based on progress",
    });

    const goal = await t.query(api.goals.get, { goalId });
    expect(goal.amendmentLog).toBeDefined();
    expect(goal.amendmentLog).toHaveLength(1);
    expect(goal.amendmentLog![0].previousTargetAccuracy).toBe(80);
    expect(goal.amendmentLog![0].previousGoalText).toBe(VALID_GOAL.fullGoalText);
    expect(goal.amendmentLog![0].reason).toBe("Adjusted based on progress");
    expect(goal.amendmentLog![0].changedBy).toBe("slp-user-123");
    expect(goal.amendmentLog![0].changedAt).toBeGreaterThan(0);
  });
});

// ── remove (soft delete) ────────────────────────────────────────────────────

describe("goals.remove", () => {
  it("soft-deletes by setting status to discontinued", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await createPatientAndGoal(t);
    await t.mutation(api.goals.remove, { goalId });
    const goal = await t.query(api.goals.get, { goalId });
    expect(goal.status).toBe("discontinued");
  });
});
