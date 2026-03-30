import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };

async function setupPatientWithSession(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, {
    firstName: "Alex",
    lastName: "Smith",
    dateOfBirth: "2020-01-15",
    diagnosis: "articulation" as const,
  });
  const sessionId = await slp.mutation(api.sessions.create, {
    title: "AAC Board",
    query: "Make an AAC board",
  });
  return { patientId, sessionId };
}

describe("patientMaterials.assign", () => {
  it("links a session to a patient", async () => {
    const t = convexTest(schema, modules);
    const { patientId, sessionId } = await setupPatientWithSession(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.patientMaterials.assign, {
      patientId,
      sessionId,
      notes: "Practice this AAC board daily",
    });

    const materials = await slp.query(api.patientMaterials.listByPatient, { patientId });
    expect(materials).toHaveLength(1);
    expect(materials[0].sessionId).toBe(sessionId);
    expect(materials[0].notes).toBe("Practice this AAC board daily");
  });

  it("rejects when neither sessionId nor appId provided", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupPatientWithSession(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await expect(
      slp.mutation(api.patientMaterials.assign, { patientId })
    ).rejects.toThrow();
  });

  it("rejects non-owner SLP", async () => {
    const t = convexTest(schema, modules);
    const { patientId, sessionId } = await setupPatientWithSession(t);

    await expect(
      t.withIdentity(OTHER_SLP).mutation(api.patientMaterials.assign, {
        patientId,
        sessionId,
      })
    ).rejects.toThrow();
  });
});

describe("patientMaterials.unassign", () => {
  it("removes a material assignment", async () => {
    const t = convexTest(schema, modules);
    const { patientId, sessionId } = await setupPatientWithSession(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.patientMaterials.assign, { patientId, sessionId });
    const materials = await slp.query(api.patientMaterials.listByPatient, { patientId });
    expect(materials).toHaveLength(1);

    await slp.mutation(api.patientMaterials.unassign, { materialId: materials[0]._id });
    const after = await slp.query(api.patientMaterials.listByPatient, { patientId });
    expect(after).toHaveLength(0);
  });
});
