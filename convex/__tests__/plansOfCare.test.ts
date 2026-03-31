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

const VALID_POC = {
  diagnosisCodes: [{ code: "F80.0", description: "Phonological disorder" }],
  longTermGoals: ["goal-1"],
  shortTermGoals: ["goal-2"],
  frequency: "2x/week",
  sessionDuration: "45 minutes",
  planDuration: "12 weeks",
  dischargeCriteria: "Patient achieves 90% accuracy across all targets",
  physicianSignatureOnFile: false,
};

async function createPatientAndPOC(
  t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  pocOverrides?: Partial<typeof VALID_POC>,
) {
  const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
  const pocId = await t.mutation(api.plansOfCare.create, {
    patientId,
    ...VALID_POC,
    ...pocOverrides,
  });
  return { patientId, pocId };
}

describe("plansOfCare.create", () => {
  it("creates POC in draft status, version 1", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { pocId } = await createPatientAndPOC(t);
    const poc = await t.query(api.plansOfCare.get, { pocId });
    expect(poc).toBeDefined();
    expect(poc!.status).toBe("draft");
    expect(poc!.version).toBe(1);
    expect(poc!.slpUserId).toBe("slp-user-123");
  });

  it("rejects access to another SLP's patient", async () => {
    const base = convexTest(schema, modules);
    const slp1 = base.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp1.mutation(api.patients.create, VALID_PATIENT);
    const slp2 = base.withIdentity(OTHER_SLP);
    await expect(
      slp2.mutation(api.plansOfCare.create, { patientId, ...VALID_POC })
    ).rejects.toThrow("Not authorized");
  });
});

describe("plansOfCare.sign", () => {
  it("transitions draft to active, sets signedAt", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { pocId } = await createPatientAndPOC(t);
    await t.mutation(api.plansOfCare.sign, { pocId });
    const poc = await t.query(api.plansOfCare.get, { pocId });
    expect(poc!.status).toBe("active");
    expect(poc!.signedAt).toBeGreaterThan(0);
  });
});

describe("plansOfCare.amend", () => {
  it("creates new version, sets old to amended", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, pocId } = await createPatientAndPOC(t);
    await t.mutation(api.plansOfCare.sign, { pocId });

    const newPocId = await t.mutation(api.plansOfCare.amend, {
      pocId,
      frequency: "3x/week",
    });

    const oldPoc = await t.query(api.plansOfCare.get, { pocId });
    expect(oldPoc!.status).toBe("amended");

    const newPoc = await t.query(api.plansOfCare.get, { pocId: newPocId });
    expect(newPoc!.version).toBe(2);
    expect(newPoc!.previousVersionId).toBe(pocId);
    expect(newPoc!.frequency).toBe("3x/week");
    expect(newPoc!.status).toBe("draft");
  });
});

describe("plansOfCare.getActiveByPatient", () => {
  it("returns active POC for patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, pocId } = await createPatientAndPOC(t);
    await t.mutation(api.plansOfCare.sign, { pocId });
    const active = await t.query(api.plansOfCare.getActiveByPatient, { patientId });
    expect(active).toBeDefined();
    expect(active!._id).toBe(pocId);
  });

  it("returns null when no active POC", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    const active = await t.query(api.plansOfCare.getActiveByPatient, { patientId });
    expect(active).toBeNull();
  });
});

describe("plansOfCare.getByPatient", () => {
  it("returns all POC versions for patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, pocId } = await createPatientAndPOC(t);
    await t.mutation(api.plansOfCare.sign, { pocId });
    await t.mutation(api.plansOfCare.amend, { pocId, frequency: "3x/week" });
    const all = await t.query(api.plansOfCare.getByPatient, { patientId });
    expect(all).toHaveLength(2);
  });
});
