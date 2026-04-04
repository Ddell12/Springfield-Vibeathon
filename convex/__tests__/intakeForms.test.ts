import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";
import { suppressSchedulerErrors } from "./testHelpers";

const modules = import.meta.glob("../**/*.*s");

suppressSchedulerErrors();

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "https://test.convex.dev" };
const CAREGIVER_IDENTITY = { subject: "caregiver-789", issuer: "https://test.convex.dev" };
const UNLINKED_USER = { subject: "random-user-999", issuer: "https://test.convex.dev" };

async function setupPatientWithCaregiver(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, {
    firstName: "Alex",
    lastName: "Smith",
    dateOfBirth: "2020-01-15",
    diagnosis: "articulation" as const,
  });

  const token = await slp.mutation(api.caregivers.createInvite, {
    patientId,
    email: "parent@test.com",
  });

  await t.withIdentity(CAREGIVER_IDENTITY).mutation(api.caregivers.acceptInvite, { token });

  return patientId;
}

describe("intakeForms.signForm", () => {
  it("signs a HIPAA NPP form for a linked patient", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await caregiver.mutation(api.intakeForms.signForm, {
      patientId,
      formType: "hipaa-npp",
      signerName: "Jane Smith",
    });

    const forms = await caregiver.query(api.intakeForms.getByCaregiver, { patientId });
    expect(forms).toHaveLength(1);
    expect(forms[0].formType).toBe("hipaa-npp");
    expect(forms[0].signerName).toBe("Jane Smith");
  });

  it("rejects unlinked user", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);

    await expect(
      t.withIdentity(UNLINKED_USER).mutation(api.intakeForms.signForm, {
        patientId,
        formType: "hipaa-npp",
        signerName: "Hacker McHackface",
      })
    ).rejects.toThrow("Not authorized");
  });

  it("sets intakeCompletedAt when all 4 required forms are signed", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const requiredForms = [
      "hipaa-npp",
      "consent-treatment",
      "financial-agreement",
      "cancellation-policy",
    ] as const;

    for (const formType of requiredForms) {
      await caregiver.mutation(api.intakeForms.signForm, {
        patientId,
        formType,
        signerName: "Jane Smith",
      });
    }

    const links = await t.withIdentity(SLP_IDENTITY).query(api.caregivers.listByPatient, { patientId });
    const acceptedLink = links.find(
      (l: { caregiverUserId?: string }) => l.caregiverUserId === "caregiver-789"
    );
    expect(acceptedLink?.intakeCompletedAt).toBeTypeOf("number");
  });

  it("does not set intakeCompletedAt with only 3 forms signed", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const partialForms = ["hipaa-npp", "consent-treatment", "financial-agreement"] as const;
    for (const formType of partialForms) {
      await caregiver.mutation(api.intakeForms.signForm, {
        patientId,
        formType,
        signerName: "Jane Smith",
      });
    }

    const links = await t.withIdentity(SLP_IDENTITY).query(api.caregivers.listByPatient, { patientId });
    const acceptedLink = links.find(
      (l: { caregiverUserId?: string }) => l.caregiverUserId === "caregiver-789"
    );
    expect(acceptedLink?.intakeCompletedAt).toBeUndefined();
  });
});

describe("intakeForms.signTelehealthConsent", () => {
  it("signs telehealth consent for a linked patient", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await caregiver.mutation(api.intakeForms.signTelehealthConsent, {
      patientId,
      signerName: "Jane Smith",
    });

    const hasTelehealth = await caregiver.query(api.intakeForms.hasTelehealthConsent, { patientId });
    expect(hasTelehealth).toBe(true);
  });
});

describe("intakeForms.getByPatient", () => {
  it("returns all forms for a patient (SLP view)", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await caregiver.mutation(api.intakeForms.signForm, {
      patientId,
      formType: "hipaa-npp",
      signerName: "Jane Smith",
    });
    await caregiver.mutation(api.intakeForms.signForm, {
      patientId,
      formType: "consent-treatment",
      signerName: "Jane Smith",
    });

    const slp = t.withIdentity(SLP_IDENTITY);
    const forms = await slp.query(api.intakeForms.getByPatient, { patientId });
    expect(forms).toHaveLength(2);
  });
});

describe("intakeForms.hasTelehealthConsent", () => {
  it("returns false when no telehealth consent exists", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const result = await caregiver.query(api.intakeForms.hasTelehealthConsent, { patientId });
    expect(result).toBe(false);
  });
});

describe("intakeForms.getRequiredProgressByCaregiver", () => {
  it("returns correct counts for partial completion", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    // Sign 1 of the 4 required forms
    await caregiver.mutation(api.intakeForms.signForm, {
      patientId,
      formType: "hipaa-npp",
      signerName: "Jane Smith",
    });

    const progress = await caregiver.query(
      api.intakeForms.getRequiredProgressByCaregiver,
      { patientId }
    );

    expect(progress.signed).toBe(1);
    expect(progress.total).toBe(4);
    expect(progress.isComplete).toBe(false);
  });

  it("returns isComplete=true when all 4 required forms are signed", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const requiredForms = [
      "hipaa-npp",
      "consent-treatment",
      "financial-agreement",
      "cancellation-policy",
    ] as const;

    for (const formType of requiredForms) {
      await caregiver.mutation(api.intakeForms.signForm, {
        patientId,
        formType,
        signerName: "Jane Smith",
      });
    }

    const progress = await caregiver.query(
      api.intakeForms.getRequiredProgressByCaregiver,
      { patientId }
    );

    expect(progress.signed).toBe(4);
    expect(progress.total).toBe(4);
    expect(progress.isComplete).toBe(true);
  });

  it("returns zero progress for unauthenticated caller", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);

    const progress = await t.query(
      api.intakeForms.getRequiredProgressByCaregiver,
      { patientId }
    );

    expect(progress.signed).toBe(0);
    expect(progress.isComplete).toBe(false);
  });
});
