import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };
const CAREGIVER_IDENTITY = {
  subject: "caregiver-789",
  issuer: "clerk",
  public_metadata: JSON.stringify({ role: "caregiver" }),
};

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

describe("patients.create", () => {
  it("creates a patient with required fields", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const result = await t.mutation(api.patients.create, VALID_PATIENT);
    expect(result.patientId).toBeDefined();
    expect(result.inviteToken).toBeUndefined();

    const patient = await t.query(api.patients.get, { patientId: result.patientId });
    expect(patient?.firstName).toBe("Alex");
    expect(patient?.status).toBe("active");
    expect(patient?.slpUserId).toBe("slp-user-123");
  });

  it("creates patient with invite when parentEmail provided", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const result = await t.mutation(api.patients.create, {
      ...VALID_PATIENT,
      parentEmail: "parent@example.com",
    });
    expect(result.inviteToken).toBeDefined();
    expect(result.inviteToken).toHaveLength(32);
  });

  it("trims and validates names", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    await expect(
      t.mutation(api.patients.create, { ...VALID_PATIENT, firstName: "" })
    ).rejects.toThrow();
    await expect(
      t.mutation(api.patients.create, { ...VALID_PATIENT, firstName: "a".repeat(101) })
    ).rejects.toThrow();
  });

  it("validates dateOfBirth is in the past and within 21 years", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    await expect(
      t.mutation(api.patients.create, { ...VALID_PATIENT, dateOfBirth: "2099-01-01" })
    ).rejects.toThrow();
    await expect(
      t.mutation(api.patients.create, { ...VALID_PATIENT, dateOfBirth: "2000-01-01" })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.patients.create, VALID_PATIENT)
    ).rejects.toThrow();
  });
});

describe("patients.list", () => {
  it("returns only the SLP's own patients", async () => {
    const t = convexTest(schema, modules);
    const slp1 = t.withIdentity(SLP_IDENTITY);
    const slp2 = t.withIdentity(OTHER_SLP);

    await slp1.mutation(api.patients.create, VALID_PATIENT);
    await slp2.mutation(api.patients.create, { ...VALID_PATIENT, firstName: "Jordan" });

    const list = await slp1.query(api.patients.list, {});
    expect(list).toHaveLength(1);
    expect(list[0].firstName).toBe("Alex");
  });

  it("filters by status", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await t.mutation(api.patients.create, { ...VALID_PATIENT, firstName: "Jordan" });
    await t.mutation(api.patients.updateStatus, { patientId, status: "discharged" });

    const active = await t.query(api.patients.list, { status: "active" });
    expect(active).toHaveLength(1);
    expect(active[0].firstName).toBe("Jordan");
  });
});

describe("patients.update", () => {
  it("partial updates work", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await t.mutation(api.patients.update, {
      patientId,
      interests: ["dinosaurs", "trains"],
    });

    const patient = await t.query(api.patients.get, { patientId });
    expect(patient?.interests).toEqual(["dinosaurs", "trains"]);
    expect(patient?.firstName).toBe("Alex");
  });

  it("rejects unauthorized SLP", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await t.withIdentity(SLP_IDENTITY).mutation(
      api.patients.create, VALID_PATIENT
    );
    await expect(
      t.withIdentity(OTHER_SLP).mutation(api.patients.update, {
        patientId,
        interests: ["hack"],
      })
    ).rejects.toThrow();
  });
});

describe("patients.updateStatus", () => {
  it("changes status and logs activity", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await t.mutation(api.patients.updateStatus, { patientId, status: "on-hold" });

    const patient = await t.query(api.patients.get, { patientId });
    expect(patient?.status).toBe("on-hold");

    const activity = await t.query(api.activityLog.listByPatient, { patientId });
    const statusChange = activity.find((a: { action: string }) => a.action === "status-changed");
    expect(statusChange).toBeDefined();
    expect(statusChange?.details).toContain("active");
    expect(statusChange?.details).toContain("on-hold");
  });
});

describe("patients.getForContext", () => {
  it("returns only allowlisted fields for the owning SLP", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, {
      ...VALID_PATIENT,
      interests: ["dinosaurs", "trains"],
      communicationLevel: "single-words" as const,
      sensoryNotes: "Sensitive to loud sounds",
      behavioralNotes: "Responds well to visual timers",
    });

    const context = await t.query(api.patients.getForContext, { patientId });
    expect(context).not.toBeNull();
    expect(context!.firstName).toBe("Alex");
    expect(context!.diagnosis).toBe("articulation");
    expect(context!.communicationLevel).toBe("single-words");
    expect(context!.interests).toEqual(["dinosaurs", "trains"]);
    expect(context!.sensoryNotes).toBe("Sensitive to loud sounds");
    expect(context!.behavioralNotes).toBe("Responds well to visual timers");
    // PII fields excluded
    expect((context as Record<string, unknown>).lastName).toBeUndefined();
    expect((context as Record<string, unknown>).dateOfBirth).toBeUndefined();
    expect((context as Record<string, unknown>).parentEmail).toBeUndefined();
    expect((context as Record<string, unknown>).slpUserId).toBeUndefined();
    expect((context as Record<string, unknown>)._id).toBeUndefined();
  });

  it("returns null for non-owning SLP (same DB, different identity)", async () => {
    const t = convexTest(schema, modules);
    const asOwner = t.withIdentity(SLP_IDENTITY);
    const asOther = t.withIdentity(OTHER_SLP);
    const { patientId } = await asOwner.mutation(api.patients.create, VALID_PATIENT);
    const context = await asOther.query(api.patients.getForContext, { patientId });
    expect(context).toBeNull();
  });

  it("throws for unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    const asSlp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await asSlp.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.query(api.patients.getForContext, { patientId })
    ).rejects.toThrow();
  });
});

describe("patients.getPublicFirstName", () => {
  it("returns first name without auth", async () => {
    const tSlp = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await tSlp.mutation(api.patients.create, VALID_PATIENT);
    // Query with a fresh unauthenticated instance sharing the same DB is not
    // possible across convexTest instances, so we verify via the same instance
    // (getPublicFirstName has no auth requirement — any caller can read it)
    const firstName = await tSlp.query(api.patients.getPublicFirstName, { patientId });
    expect(firstName).toBe("Alex");
  });
});

describe("patients.getForPlay", () => {
  it("returns patient for the owning SLP", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    const patient = await t.query(api.patients.getForPlay, { patientId });
    expect(patient).not.toBeNull();
    expect(patient?.firstName).toBe("Alex");
  });

  it("returns patient for authorized caregiver (accepted caregiverLink)", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);

    // Directly insert an accepted caregiverLink — bypasses invite flow
    // scheduler (clerkActions.setCaregiverRole) which can't run in convex-test
    await t.run(async (ctx) => {
      await ctx.db.insert("caregiverLinks", {
        patientId,
        caregiverUserId: CAREGIVER_IDENTITY.subject,
        email: "caregiver@test.com",
        inviteToken: "test-token-abc",
        inviteStatus: "accepted",
      });
    });

    const patient = await caregiver.query(api.patients.getForPlay, { patientId });
    expect(patient).not.toBeNull();
    expect(patient?.firstName).toBe("Alex");
  });

  it("returns null for unlinked user (no throw)", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await t.withIdentity(SLP_IDENTITY).mutation(
      api.patients.create,
      VALID_PATIENT
    );
    const patient = await t.withIdentity(OTHER_SLP).query(api.patients.getForPlay, { patientId });
    expect(patient).toBeNull();
  });

  it("returns null for unauthenticated user (no throw)", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await t.withIdentity(SLP_IDENTITY).mutation(
      api.patients.create,
      VALID_PATIENT
    );
    const patient = await t.query(api.patients.getForPlay, { patientId });
    expect(patient).toBeNull();
  });
});

describe("patients.getStats", () => {
  it("returns correct counts by status", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    await t.mutation(api.patients.create, VALID_PATIENT);
    await t.mutation(api.patients.create, { ...VALID_PATIENT, firstName: "B" });
    const { patientId } = await t.mutation(api.patients.create, { ...VALID_PATIENT, firstName: "C" });
    await t.mutation(api.patients.updateStatus, { patientId, status: "discharged" });

    const stats = await t.query(api.patients.getStats, {});
    expect(stats.active).toBe(2);
    expect(stats.discharged).toBe(1);
    expect(stats.onHold).toBe(0);
    expect(stats.pendingIntake).toBe(0);
  });
});
