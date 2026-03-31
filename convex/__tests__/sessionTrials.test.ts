import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };

const today = new Date().toISOString().slice(0, 10);

// Helper to create patient + goal for test setup
async function setupPatientAndGoal(t: ReturnType<typeof convexTest>) {
  const { patientId } = await t.mutation(api.patients.create, {
    firstName: "Test",
    lastName: "Patient",
    dateOfBirth: "2015-01-01",
    diagnosis: "articulation",
  });

  const goalId = await t.mutation(api.goals.create, {
    patientId,
    domain: "articulation",
    shortDescription: "Produce /s/ in words",
    fullGoalText: "Patient will produce /s/ in initial position of words with 80% accuracy in 3 consecutive sessions.",
    targetAccuracy: 80,
    targetConsecutiveSessions: 3,
    startDate: "2026-01-01",
  });

  return { patientId, goalId };
}

describe("sessionTrials.start", () => {
  it("creates a trial collection record", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, {
      patientId,
      goalId,
      sessionDate: today,
    });
    expect(trialId).toBeDefined();
  });

  it("sets correct initial fields", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, {
      patientId,
      goalId,
      sessionDate: today,
    });
    const active = await t.query(api.sessionTrials.getActiveForPatient, { patientId });
    expect(active).toHaveLength(1);
    expect(active[0]._id).toBe(trialId);
    expect(active[0].trials).toEqual([]);
    expect(active[0].endedAt).toBeUndefined();
  });

  it("rejects non-owner SLP", async () => {
    const base = convexTest(schema, modules);
    const slp1 = base.withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(slp1);
    const slp2 = base.withIdentity(OTHER_SLP);
    await expect(
      slp2.mutation(api.sessionTrials.start, { patientId, goalId, sessionDate: today })
    ).rejects.toThrow();
  });
});

describe("sessionTrials.recordTrial", () => {
  it("appends a trial to the array", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, { patientId, goalId, sessionDate: today });
    await t.mutation(api.sessionTrials.recordTrial, { trialId, correct: true, cueLevel: "independent" });
    await t.mutation(api.sessionTrials.recordTrial, { trialId, correct: false, cueLevel: "mod-cue" });
    const active = await t.query(api.sessionTrials.getActiveForPatient, { patientId });
    expect(active[0].trials).toHaveLength(2);
    expect(active[0].trials[0].correct).toBe(true);
    expect(active[0].trials[1].correct).toBe(false);
  });

  it("rejects recording on ended collection", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, { patientId, goalId, sessionDate: today });
    await t.mutation(api.sessionTrials.endCollection, { trialId });
    await expect(
      t.mutation(api.sessionTrials.recordTrial, { trialId, correct: true, cueLevel: "independent" })
    ).rejects.toThrow();
  });
});

describe("sessionTrials.endCollection", () => {
  it("sets endedAt timestamp", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, { patientId, goalId, sessionDate: today });
    await t.mutation(api.sessionTrials.endCollection, { trialId });
    const byDate = await t.query(api.sessionTrials.listByPatientDate, { patientId, sessionDate: today });
    expect(byDate[0].endedAt).toBeDefined();
    expect(typeof byDate[0].endedAt).toBe("number");
  });
});

describe("sessionTrials.linkToSessionNote", () => {
  it("links trial to session note and returns targetsWorkedOn", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, { patientId, goalId, sessionDate: today });
    for (let i = 0; i < 3; i++) {
      await t.mutation(api.sessionTrials.recordTrial, { trialId, correct: true, cueLevel: "independent" });
    }
    await t.mutation(api.sessionTrials.recordTrial, { trialId, correct: false, cueLevel: "min-cue" });
    await t.mutation(api.sessionTrials.endCollection, { trialId });

    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      sessionDate: today,
      sessionDuration: 30,
      sessionType: "in-person",
      structuredData: { targetsWorkedOn: [] },
    });

    const targets = await t.mutation(api.sessionTrials.linkToSessionNote, {
      trialIds: [trialId],
      sessionNoteId: noteId,
    });

    expect(targets).toHaveLength(1);
    expect(targets[0].target).toBeDefined();
    expect(targets[0].trials).toBe(4);
    expect(targets[0].correct).toBe(3);
  });
});

describe("sessionTrials queries", () => {
  it("listBySessionNote returns linked trials", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, { patientId, goalId, sessionDate: today });
    await t.mutation(api.sessionTrials.endCollection, { trialId });

    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      sessionDate: today,
      sessionDuration: 30,
      sessionType: "in-person",
      structuredData: { targetsWorkedOn: [] },
    });

    await t.mutation(api.sessionTrials.linkToSessionNote, { trialIds: [trialId], sessionNoteId: noteId });
    const linked = await t.query(api.sessionTrials.listBySessionNote, { sessionNoteId: noteId });
    expect(linked).toHaveLength(1);
  });

  it("getActiveForPatient excludes ended collections", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, { patientId, goalId, sessionDate: today });
    await t.mutation(api.sessionTrials.endCollection, { trialId });
    const active = await t.query(api.sessionTrials.getActiveForPatient, { patientId });
    expect(active).toHaveLength(0);
  });
});
