import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

const VALID_DISCHARGE = {
  serviceStartDate: "2025-09-01",
  serviceEndDate: "2026-03-30",
  presentingDiagnosis: "Phonological disorder (F80.0)",
  goalsAchieved: [
    { goalId: "goal-1", shortDescription: "Produce /s/ in initial position", finalAccuracy: 92 },
  ],
  goalsNotMet: [
    { goalId: "goal-2", shortDescription: "Produce /r/ in all positions", finalAccuracy: 65, reason: "Insufficient progress" },
  ],
  dischargeReason: "goals-met" as const,
  narrative: "",
  recommendations: "",
};

async function createPatientAndDischarge(
  t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  overrides?: Partial<typeof VALID_DISCHARGE>,
) {
  const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
  const dischargeId = await t.mutation(api.dischargeSummaries.create, {
    patientId,
    ...VALID_DISCHARGE,
    ...overrides,
  });
  return { patientId, dischargeId };
}

describe("dischargeSummaries.create", () => {
  it("creates discharge summary in draft status", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { dischargeId } = await createPatientAndDischarge(t);
    const discharge = await t.query(api.dischargeSummaries.get, { dischargeId });
    expect(discharge).toBeDefined();
    expect(discharge!.status).toBe("draft");
    expect(discharge!.slpUserId).toBe("slp-user-123");
  });

  it("rejects access to another SLP's patient", async () => {
    const base = convexTest(schema, modules);
    const slp1 = base.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp1.mutation(api.patients.create, VALID_PATIENT);
    const slp2 = base.withIdentity(OTHER_SLP);
    await expect(
      slp2.mutation(api.dischargeSummaries.create, { patientId, ...VALID_DISCHARGE })
    ).rejects.toThrow("Not authorized");
  });
});

describe("dischargeSummaries.update", () => {
  it("updates fields on draft discharge", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { dischargeId } = await createPatientAndDischarge(t);
    await t.mutation(api.dischargeSummaries.update, {
      dischargeId,
      narrative: "Updated narrative",
    });
    const discharge = await t.query(api.dischargeSummaries.get, { dischargeId });
    expect(discharge!.narrative).toBe("Updated narrative");
  });

  it("rejects update on signed discharge", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { dischargeId } = await createPatientAndDischarge(t, {
      narrative: "Final narrative",
      recommendations: "Continue home practice",
    });
    await t.mutation(api.dischargeSummaries.sign, { dischargeId });
    await expect(
      t.mutation(api.dischargeSummaries.update, { dischargeId, narrative: "Changed" })
    ).rejects.toThrow("signed");
  });
});

describe("dischargeSummaries.sign", () => {
  it("signs discharge, sets signedAt", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { dischargeId } = await createPatientAndDischarge(t, {
      narrative: "Treatment summary narrative",
      recommendations: "Continue home practice",
    });
    await t.mutation(api.dischargeSummaries.sign, { dischargeId });
    const discharge = await t.query(api.dischargeSummaries.get, { dischargeId });
    expect(discharge!.status).toBe("signed");
    expect(discharge!.signedAt).toBeGreaterThan(0);
  });
});

describe("dischargeSummaries.getByPatient", () => {
  it("returns discharge summaries for patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatientAndDischarge(t);
    const summaries = await t.query(api.dischargeSummaries.getByPatient, { patientId });
    expect(summaries).toHaveLength(1);
  });
});
