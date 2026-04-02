import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../_generated/api";
import schema from "../schema";
import { createTestPatient } from "./testHelpers";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_IDENTITY = { subject: "other-user-456", issuer: "clerk" };

describe("activityLog", () => {
  it("log writes an activity entry", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createTestPatient(t);

    await t.mutation(internal.activityLog.log, {
      patientId,
      actorUserId: "slp-user-123",
      action: "patient-created",
      details: "Created patient Alex Smith",
      timestamp: Date.now(),
    });

    const entries = await t.withIdentity(SLP_IDENTITY).query(
      api.activityLog.listByPatient,
      { patientId }
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe("patient-created");
  });

  it("listByPatient respects limit", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createTestPatient(t);
    const now = Date.now();

    for (let i = 0; i < 5; i++) {
      await t.mutation(internal.activityLog.log, {
        patientId,
        actorUserId: "slp-user-123",
        action: "profile-updated",
        timestamp: now + i,
      });
    }

    const entries = await t.withIdentity(SLP_IDENTITY).query(
      api.activityLog.listByPatient,
      { patientId, limit: 3 }
    );
    expect(entries).toHaveLength(3);
  });

  it("listByPatient rejects unauthorized user", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createTestPatient(t);

    await expect(
      t.withIdentity(OTHER_IDENTITY).query(
        api.activityLog.listByPatient,
        { patientId }
      )
    ).rejects.toThrow();
  });
});

describe("shared test helpers", () => {
  it("creates a patient through shared test helpers", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createTestPatient(t, { slpUserId: "slp-user-123" });
    expect(patientId).toBeTruthy();
  });
});
