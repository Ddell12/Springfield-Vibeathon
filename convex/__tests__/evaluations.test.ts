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

const today = new Date().toISOString().slice(0, 10);

const VALID_EVALUATION = {
  evaluationDate: today,
  backgroundHistory: "Patient was referred for articulation concerns. No prior speech services.",
  assessmentTools: [
    { name: "GFTA-3", scoresRaw: "45", scoresStandard: "78", percentile: "7th" },
  ],
  domainFindings: {
    articulation: { narrative: "Patient demonstrates /r/ and /s/ distortions in all positions.", scores: "7th percentile" },
  },
  behavioralObservations: "Patient was cooperative and engaged throughout testing.",
  clinicalInterpretation: "",
  diagnosisCodes: [{ code: "F80.0", description: "Phonological disorder" }],
  prognosis: "good" as const,
  recommendations: "",
};

async function createPatientAndEval(
  t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  evalOverrides?: Partial<typeof VALID_EVALUATION>,
) {
  const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
  const evalId = await t.mutation(api.evaluations.create, {
    patientId,
    ...VALID_EVALUATION,
    ...evalOverrides,
  });
  return { patientId, evalId };
}

describe("evaluations.create", () => {
  it("creates evaluation in draft status with correct slpUserId", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { evalId } = await createPatientAndEval(t);
    const evaluation = await t.query(api.evaluations.get, { evalId });
    expect(evaluation).toBeDefined();
    expect(evaluation!.status).toBe("draft");
    expect(evaluation!.slpUserId).toBe("slp-user-123");
    expect(evaluation!.evaluationDate).toBe(today);
  });

  it("rejects unauthenticated users", async () => {
    const base = convexTest(schema, modules);
    const authed = base.withIdentity(SLP_IDENTITY);
    const { patientId } = await authed.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      base.mutation(api.evaluations.create, { patientId, ...VALID_EVALUATION })
    ).rejects.toThrow();
  });

  it("rejects access to another SLP's patient", async () => {
    const base = convexTest(schema, modules);
    const slp1 = base.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp1.mutation(api.patients.create, VALID_PATIENT);
    const slp2 = base.withIdentity(OTHER_SLP);
    await expect(
      slp2.mutation(api.evaluations.create, { patientId, ...VALID_EVALUATION })
    ).rejects.toThrow("Not authorized");
  });
});

describe("evaluations.update", () => {
  it("updates fields on draft evaluation", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { evalId } = await createPatientAndEval(t);
    await t.mutation(api.evaluations.update, {
      evalId,
      backgroundHistory: "Updated history",
    });
    const evaluation = await t.query(api.evaluations.get, { evalId });
    expect(evaluation!.backgroundHistory).toBe("Updated history");
  });

  it("rejects update on signed evaluation", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { evalId } = await createPatientAndEval(t, {
      clinicalInterpretation: "Interpretation text",
      recommendations: "Recommend 2x/week therapy",
    });
    await t.mutation(api.evaluations.updateStatus, { evalId, status: "complete" });
    await t.mutation(api.evaluations.sign, { evalId });
    await expect(
      t.mutation(api.evaluations.update, { evalId, backgroundHistory: "Changed" })
    ).rejects.toThrow("signed");
  });
});

describe("evaluations.sign", () => {
  it("signs complete evaluation, sets signedAt, propagates ICD codes to patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, evalId } = await createPatientAndEval(t, {
      clinicalInterpretation: "Clinical interpretation text",
      recommendations: "Recommend 2x/week speech therapy",
    });
    await t.mutation(api.evaluations.updateStatus, { evalId, status: "complete" });
    await t.mutation(api.evaluations.sign, { evalId });

    const evaluation = await t.query(api.evaluations.get, { evalId });
    expect(evaluation!.status).toBe("signed");
    expect(evaluation!.signedAt).toBeGreaterThan(0);

    const patient = await t.query(api.patients.get, { patientId });
    expect(patient!.icdCodes).toEqual([{ code: "F80.0", description: "Phonological disorder" }]);
  });

  it("rejects signing draft evaluation", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { evalId } = await createPatientAndEval(t);
    await expect(t.mutation(api.evaluations.sign, { evalId })).rejects.toThrow("complete");
  });
});

describe("evaluations.unsign", () => {
  it("reverts signed to complete, clears signedAt", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { evalId } = await createPatientAndEval(t, {
      clinicalInterpretation: "Interpretation",
      recommendations: "Recommendations",
    });
    await t.mutation(api.evaluations.updateStatus, { evalId, status: "complete" });
    await t.mutation(api.evaluations.sign, { evalId });
    await t.mutation(api.evaluations.unsign, { evalId });

    const evaluation = await t.query(api.evaluations.get, { evalId });
    expect(evaluation!.status).toBe("complete");
    expect(evaluation!.signedAt).toBeUndefined();
  });
});

describe("evaluations.getByPatient", () => {
  it("returns evaluations for patient sorted by date desc", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await t.mutation(api.evaluations.create, {
      patientId,
      ...VALID_EVALUATION,
      evaluationDate: "2026-01-15",
    });
    await t.mutation(api.evaluations.create, {
      patientId,
      ...VALID_EVALUATION,
      evaluationDate: "2026-03-15",
    });
    const evals = await t.query(api.evaluations.getByPatient, { patientId });
    expect(evals).toHaveLength(2);
  });
});
