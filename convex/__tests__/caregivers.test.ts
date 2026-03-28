import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };
const CAREGIVER_IDENTITY = { subject: "caregiver-789", issuer: "clerk" };
const OTHER_CAREGIVER = { subject: "caregiver-other", issuer: "clerk" };

async function createPatient(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, {
    firstName: "Alex",
    lastName: "Smith",
    dateOfBirth: "2020-01-15",
    diagnosis: "articulation" as const,
  });
  return patientId;
}

describe("caregivers.createInvite", () => {
  it("generates invite for existing patient", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });
    expect(token).toHaveLength(32);

    const links = await slp.query(api.caregivers.listByPatient, { patientId });
    expect(links).toHaveLength(1);
    expect(links[0].inviteStatus).toBe("pending");
  });

  it("rejects non-owner SLP", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);

    await expect(
      t.withIdentity(OTHER_SLP).mutation(api.caregivers.createInvite, {
        patientId,
        email: "parent@test.com",
      })
    ).rejects.toThrow();
  });
});

describe("caregivers.getInvite", () => {
  it("returns patient and SLP info for valid pending token", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });

    const info = await t.query(api.caregivers.getInvite, { token });
    expect(info).not.toBeNull();
    expect(info?.patientFirstName).toBe("Alex");
  });

  it("returns null for invalid token", async () => {
    const t = convexTest(schema, modules);
    const info = await t.query(api.caregivers.getInvite, { token: "nonexistent" });
    expect(info).toBeNull();
  });
});

describe("caregivers.acceptInvite", () => {
  it("links caregiver and flips status", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });

    await t.withIdentity(CAREGIVER_IDENTITY).mutation(
      api.caregivers.acceptInvite,
      { token }
    );

    const links = await slp.query(api.caregivers.listByPatient, { patientId });
    expect(links[0].inviteStatus).toBe("accepted");
    expect(links[0].caregiverUserId).toBe("caregiver-789");
  });

  it("is idempotent for same user", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });

    await caregiver.mutation(api.caregivers.acceptInvite, { token });
    await caregiver.mutation(api.caregivers.acceptInvite, { token });

    const links = await slp.query(api.caregivers.listByPatient, { patientId });
    expect(links).toHaveLength(1);
  });

  it("rejects already-accepted by different user", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });

    await t.withIdentity(CAREGIVER_IDENTITY).mutation(
      api.caregivers.acceptInvite,
      { token }
    );

    await expect(
      t.withIdentity(OTHER_CAREGIVER).mutation(
        api.caregivers.acceptInvite,
        { token }
      )
    ).rejects.toThrow();
  });
});

describe("caregivers.revokeInvite", () => {
  it("revokes a pending invite", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });

    await slp.mutation(api.caregivers.revokeInvite, { token });

    const info = await t.query(api.caregivers.getInvite, { token });
    expect(info).toBeNull();
  });
});

describe("caregivers.listByCaregiver", () => {
  it("returns patients linked to the caregiver", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });
    await caregiver.mutation(api.caregivers.acceptInvite, { token });

    const patients = await caregiver.query(api.caregivers.listByCaregiver, {});
    expect(patients).toHaveLength(1);
    expect(patients[0].patientId).toBe(patientId);
  });
});
