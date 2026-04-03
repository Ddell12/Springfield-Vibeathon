import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../_generated/api";
import schema from "../schema";
import { createTestPatient, createTestUser } from "./testHelpers";

const modules = import.meta.glob("../**/*.*s");

describe("activityLog", () => {
  it("log writes an activity entry", async () => {
    const t = convexTest(schema, modules);
    const { userId: slpUserId, identity: slpIdentity } = await createTestUser(t, "slp");
    const patientId = await createTestPatient(t, { slpUserId });

    await t.mutation(internal.activityLog.log, {
      patientId,
      actorUserId: slpUserId,
      action: "patient-created",
      details: "Created patient Alex Smith",
      timestamp: Date.now(),
    });

    const entries = await t.withIdentity(slpIdentity).query(
      api.activityLog.listByPatient,
      { patientId }
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe("patient-created");
  });

  it("listByPatient respects limit", async () => {
    const t = convexTest(schema, modules);
    const { userId: slpUserId, identity: slpIdentity } = await createTestUser(t, "slp");
    const patientId = await createTestPatient(t, { slpUserId });
    const now = Date.now();

    for (let i = 0; i < 5; i++) {
      await t.mutation(internal.activityLog.log, {
        patientId,
        actorUserId: slpUserId,
        action: "profile-updated",
        timestamp: now + i,
      });
    }

    const entries = await t.withIdentity(slpIdentity).query(
      api.activityLog.listByPatient,
      { patientId, limit: 3 }
    );
    expect(entries).toHaveLength(3);
  });

  it("listByPatient rejects unauthorized user", async () => {
    const t = convexTest(schema, modules);
    const { userId: slpUserId } = await createTestUser(t, "slp");
    const { identity: otherIdentity } = await createTestUser(t, "slp");
    const patientId = await createTestPatient(t, { slpUserId });

    await expect(
      t.withIdentity(otherIdentity).query(
        api.activityLog.listByPatient,
        { patientId }
      )
    ).rejects.toThrow();
  });
});

describe("shared test helpers", () => {
  it("creates a patient through shared test helpers", async () => {
    const t = convexTest(schema, modules);
    const { userId: slpUserId } = await createTestUser(t, "slp");
    const patientId = await createTestPatient(t, { slpUserId });
    expect(patientId).toBeTruthy();
  });
});
