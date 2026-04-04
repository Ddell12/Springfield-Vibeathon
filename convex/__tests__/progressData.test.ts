import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");
const SLP_IDENTITY = { subject: "slp-user-123", issuer: "https://test.convex.dev" };
const today = new Date().toISOString().slice(0, 10);

async function setup(t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>) {
  const { patientId } = await t.mutation(api.patients.create, {
    firstName: "Alex",
    lastName: "Smith",
    dateOfBirth: "2020-01-15",
    diagnosis: "articulation" as const,
  });
  const goalId = await t.mutation(api.goals.create, {
    patientId,
    domain: "articulation" as const,
    shortDescription: "Produce /r/ in initial position",
    fullGoalText: "Test goal with 80% accuracy across 3 sessions.",
    targetAccuracy: 80,
    targetConsecutiveSessions: 3,
    startDate: today,
  });
  return { patientId, goalId };
}

describe("progressData.createManual", () => {
  it("creates a manual data point", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await setup(t);
    const id = await t.mutation(api.progressData.createManual, {
      goalId,
      date: today,
      accuracy: 75,
      trials: 20,
      correct: 15,
      promptLevel: "verbal-cue" as const,
    });
    expect(id).toBeDefined();
  });

  it("rejects accuracy outside 0-100", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await setup(t);
    await expect(
      t.mutation(api.progressData.createManual, { goalId, date: today, accuracy: 101 })
    ).rejects.toThrow("Accuracy must be between 0 and 100");
  });

  it("rejects correct > trials", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await setup(t);
    await expect(
      t.mutation(api.progressData.createManual, {
        goalId, date: today, accuracy: 80, trials: 10, correct: 15,
      })
    ).rejects.toThrow("Correct cannot exceed total trials");
  });
});

describe("progressData.listByGoal", () => {
  it("returns data points for a goal ordered by date desc", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await setup(t);
    await t.mutation(api.progressData.createManual, { goalId, date: "2026-03-26", accuracy: 70 });
    await t.mutation(api.progressData.createManual, { goalId, date: "2026-03-27", accuracy: 80 });
    const data = await t.query(api.progressData.listByGoal, { goalId });
    expect(data).toHaveLength(2);
    expect(data[0].date).toBe("2026-03-27");
  });
});
