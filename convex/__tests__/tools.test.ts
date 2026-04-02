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

  it("creates a draft app instance without a patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);

    const id = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Portable Snack Board",
      configJson: '{"title":"Snack Board"}',
    });

    const instance = await t.query(api.tools.get, { id });
    expect(instance?.patientId).toBeUndefined();
  });

  it("listRecentBySLP returns only the newest five tools for the current therapist", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);

    for (const title of ["A", "B", "C", "D", "E", "F"]) {
      await t.mutation(api.tools.create, {
        templateType: "aac_board",
        title,
        patientId,
        configJson: SAMPLE_CONFIG,
      });
    }

    const recent = await t.query(api.tools.listRecentBySLP, { limit: 5 });

    expect(recent).toHaveLength(5);
    expect(recent.map((tool) => tool.title)).toEqual(["F", "E", "D", "C", "B"]);
  });

  it("listPageBySLP returns only non-archived results by default", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    await t.mutation(api.tools.create, {
      templateType: "visual_schedule",
      title: "Alpha Board",
      configJson: SAMPLE_CONFIG,
    });
    const archivedId = await t.mutation(api.tools.create, {
      templateType: "token_board",
      title: "Archived Board",
      configJson: SAMPLE_CONFIG,
    });
    await t.mutation(api.tools.archive, { id: archivedId });

    const page = await t.query(api.tools.listPageBySLP, {
      page: 1,
      pageSize: 12,
      search: "",
      sortBy: "recent",
    });

    expect(page.items.map((item) => item.title)).toEqual(["Alpha Board"]);
    expect(page.totalCount).toBe(1);
  });

  it("listPageBySLP returns correct items on page 2", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    for (let i = 1; i <= 13; i++) {
      await t.mutation(api.tools.create, {
        templateType: "visual_schedule",
        title: `App ${String(i).padStart(2, "0")}`,
        configJson: SAMPLE_CONFIG,
      });
    }

    const page2 = await t.query(api.tools.listPageBySLP, {
      page: 2,
      pageSize: 12,
      search: "",
      sortBy: "alphabetical",
    });

    expect(page2.totalCount).toBe(13);
    expect(page2.items).toHaveLength(1);
    expect(page2.items[0].title).toBe("App 13");
  });

  it("listPageBySLP applies search and alphabetical sort", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    await t.mutation(api.tools.create, {
      templateType: "visual_schedule",
      title: "Banana Board",
      configJson: SAMPLE_CONFIG,
    });
    await t.mutation(api.tools.create, {
      templateType: "visual_schedule",
      title: "Apple Board",
      configJson: SAMPLE_CONFIG,
    });

    const page = await t.query(api.tools.listPageBySLP, {
      page: 1,
      pageSize: 12,
      search: "Board",
      sortBy: "alphabetical",
    });

    expect(page.items.map((item) => item.title)).toEqual(["Apple Board", "Banana Board"]);
  });
});

describe("duplicate", () => {
  it("creates a draft copy", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    const originalId = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Snack Board",
      patientId,
      configJson: SAMPLE_CONFIG,
    });

    const copyId = await t.mutation(api.tools.duplicate, {
      id: originalId,
      patientId,
    });

    const copy = await t.query(api.tools.get, { id: copyId });
    expect(copy).not.toBeNull();
    expect(copy?.status).toBe("draft");
    expect(copy?.version).toBe(1);
    expect(copy?.configJson).toBe(SAMPLE_CONFIG);
    expect(copy?.title).toBe("Copy of Snack Board");
  });

  it("respects custom title", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    const originalId = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Snack Board",
      patientId,
      configJson: SAMPLE_CONFIG,
    });

    const copyId = await t.mutation(api.tools.duplicate, {
      id: originalId,
      patientId,
      title: "Custom Name",
    });

    const copy = await t.query(api.tools.get, { id: copyId });
    expect(copy?.title).toBe("Custom Name");
  });

  it("does not copy shareToken", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    const originalId = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Snack Board",
      patientId,
      configJson: SAMPLE_CONFIG,
    });
    await t.mutation(api.tools.publish, { id: originalId });

    const copyId = await t.mutation(api.tools.duplicate, {
      id: originalId,
      patientId,
    });

    const copy = await t.query(api.tools.get, { id: copyId });
    expect(copy?.shareToken).toBeUndefined();
  });

  it("throws Forbidden for wrong SLP", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, PATIENT_FIELDS);
    const originalId = await slp.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Snack Board",
      patientId,
      configJson: SAMPLE_CONFIG,
    });

    const otherSlp = t.withIdentity({ subject: "other-slp", issuer: "clerk" });
    await expect(
      otherSlp.mutation(api.tools.duplicate, { id: originalId, patientId })
    ).rejects.toThrow("Forbidden");
  });
});

describe("getEventSummaryByPatient", () => {
  it("returns empty array when no app instances", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    const summary = await t.query(api.tools.getEventSummaryByPatient, { patientId });
    expect(summary).toEqual([]);
  });

  it("returns summary for published instance with no events", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    const id = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Snack Board",
      patientId,
      configJson: SAMPLE_CONFIG,
    });
    await t.mutation(api.tools.publish, { id });

    const summary = await t.query(api.tools.getEventSummaryByPatient, { patientId });
    expect(summary.length).toBe(1);
    expect(summary[0].title).toBe("Snack Board");
    expect(summary[0].status).toBe("published");
    expect(summary[0].totalEvents).toBe(0);
    expect(summary[0].completions).toBe(0);
    expect(summary[0].interactions).toBe(0);
  });

  it("counts completions and interactions correctly", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    const id = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Snack Board",
      patientId,
      configJson: SAMPLE_CONFIG,
    });
    const { shareToken } = await t.mutation(api.tools.publish, { id });

    // Log 2 completions, 3 interactions, 1 other event
    await t.mutation(api.tools.logEvent, { shareToken, eventType: "activity_completed" });
    await t.mutation(api.tools.logEvent, { shareToken, eventType: "activity_completed" });
    await t.mutation(api.tools.logEvent, { shareToken, eventType: "item_tapped" });
    await t.mutation(api.tools.logEvent, { shareToken, eventType: "answer_correct" });
    await t.mutation(api.tools.logEvent, { shareToken, eventType: "token_added" });
    await t.mutation(api.tools.logEvent, { shareToken, eventType: "app_opened" });

    const summary = await t.query(api.tools.getEventSummaryByPatient, { patientId });
    expect(summary.length).toBe(1);
    expect(summary[0].totalEvents).toBe(6);
    expect(summary[0].completions).toBe(2);
    expect(summary[0].interactions).toBe(3);
    expect(summary[0].lastActivityAt).not.toBeNull();
  });
});
