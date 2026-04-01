import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };

const PATIENT_FIELDS = {
  firstName: "Liam",
  lastName: "Smith",
  dateOfBirth: "2018-01-01",
  diagnosis: "aac-complex" as const,
};

const SAMPLE_CONFIG = JSON.stringify({
  title: "Snack Requests",
  gridCols: 3,
  gridRows: 2,
  buttons: [{ id: "1", label: "Crackers", speakText: "I want crackers" }],
  showTextLabels: true,
  autoSpeak: true,
  voice: "child-friendly",
  highContrast: false,
});

async function createPatient(t: ReturnType<typeof convexTest>) {
  return t.mutation(api.patients.create, PATIENT_FIELDS);
}

describe("tools", () => {
  it("creates a draft app instance", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);

    const id = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Snack Board",
      patientId,
      configJson: SAMPLE_CONFIG,
    });

    const instance = await t.query(api.tools.get, { id });
    expect(instance).not.toBeNull();
    expect(instance?.title).toBe("Snack Board");
    expect(instance?.status).toBe("draft");
    expect(instance?.version).toBe(1);
    expect(instance?.slpUserId).toBe("slp-user-123");
  });

  it("updates configJson", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    const id = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Snack Board",
      patientId,
      configJson: SAMPLE_CONFIG,
    });
    const updated = JSON.stringify({ ...JSON.parse(SAMPLE_CONFIG), title: "Drink Board" });
    await t.mutation(api.tools.update, { id, configJson: updated });
    const instance = await t.query(api.tools.get, { id });
    expect(instance?.configJson).toBe(updated);
  });

  it("publish creates version snapshot and sets shareToken", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    const id = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Snack Board",
      patientId,
      configJson: SAMPLE_CONFIG,
    });
    const { shareToken } = await t.mutation(api.tools.publish, { id });
    expect(typeof shareToken).toBe("string");
    expect(shareToken.length).toBeGreaterThan(10);
    const instance = await t.query(api.tools.get, { id });
    expect(instance?.status).toBe("published");
    expect(instance?.shareToken).toBe(shareToken);
  });

  it("getByShareToken returns instance and configJson from published snapshot", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    const id = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Snack Board",
      patientId,
      configJson: SAMPLE_CONFIG,
    });
    const { shareToken } = await t.mutation(api.tools.publish, { id });
    const result = await t.query(api.tools.getByShareToken, { shareToken });
    expect(result).not.toBeNull();
    expect(result?.instance.title).toBe("Snack Board");
    expect(result?.configJson).toBe(SAMPLE_CONFIG);
  });

  it("getByShareToken returns null for unknown token", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const result = await t.query(api.tools.getByShareToken, { shareToken: "bogus-token" });
    expect(result).toBeNull();
  });

  it("listBySLP returns only the authenticated user's instances", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Board A",
      patientId,
      configJson: SAMPLE_CONFIG,
    });
    const list = await t.query(api.tools.listBySLP, {});
    expect(list.length).toBe(1);
    expect(list[0].slpUserId).toBe("slp-user-123");
  });

  it("listByPatient returns instances for that patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Board A",
      patientId,
      configJson: SAMPLE_CONFIG,
    });
    const list = await t.query(api.tools.listByPatient, { patientId });
    expect(list.length).toBe(1);
  });
});
