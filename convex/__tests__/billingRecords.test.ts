/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

describe("billingRecords schema", () => {
  it("billingRecords table exists in schema", () => {
    expect(schema.tables.billingRecords).toBeDefined();
  });
});

import { api, internal } from "../_generated/api";

const SLP_IDENTITY = { subject: "slp-user-billing", issuer: "clerk" };

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

describe("patients insurance fields", () => {
  it("can store insurance fields on patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);

    await t.mutation(api.patients.update, {
      patientId,
      insuranceCarrier: "Blue Cross Blue Shield",
      insuranceMemberId: "BCB123456789",
      insuranceGroupNumber: "GRP001",
      insurancePhone: "1-800-555-0100",
    });

    const patient = await t.query(api.patients.get, { patientId });
    expect(patient!.insuranceCarrier).toBe("Blue Cross Blue Shield");
    expect(patient!.insuranceMemberId).toBe("BCB123456789");
    expect(patient!.insuranceGroupNumber).toBe("GRP001");
    expect(patient!.insurancePhone).toBe("1-800-555-0100");
  });
});

describe("practiceProfiles", () => {
  it("table exists in schema", () => {
    expect(schema.tables.practiceProfiles).toBeDefined();
  });

  it("can create and read a practice profile", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);

    await t.mutation(api.practiceProfiles.upsert, {
      practiceName: "Springfield Speech Clinic",
      npiNumber: "1234567890",
      taxId: "12-3456789",
      address: "123 Main St, Springfield, IL 62701",
      phone: "217-555-0100",
      credentials: "CCC-SLP",
      licenseNumber: "SLP-12345",
      defaultSessionFee: 15000,
    });

    const profile = await t.query(api.practiceProfiles.get, {});
    expect(profile).toBeDefined();
    expect(profile!.practiceName).toBe("Springfield Speech Clinic");
    expect(profile!.defaultSessionFee).toBe(15000);
  });
});

const today = new Date().toISOString().slice(0, 10);

const VALID_SESSION_DATA = {
  sessionDate: today,
  sessionDuration: 30,
  sessionType: "in-person" as const,
  structuredData: {
    targetsWorkedOn: [
      {
        target: "Initial /s/ in words",
        trials: 20,
        correct: 14,
        promptLevel: "verbal-cue" as const,
      },
    ],
  },
};

describe("billingRecords.createFromSessionNote", () => {
  it("creates a draft billing record with correct defaults", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      slpUserId: "slp-user-billing",
      patientId,
      sessionDate: today,
      sessionType: "in-person",
    });

    const records = await t.query(api.billingRecords.listByPatient, { patientId });
    expect(records).toHaveLength(1);
    expect(records[0].cptCode).toBe("92507");
    expect(records[0].modifiers).toContain("GP");
    expect(records[0].modifiers).not.toContain("95");
    expect(records[0].placeOfService).toBe("11");
    expect(records[0].status).toBe("draft");
    expect(records[0].units).toBe(1);
  });

  it("applies 95 modifier and POS 02 for teletherapy", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
      sessionType: "teletherapy" as const,
    });

    await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      slpUserId: "slp-user-billing",
      patientId,
      sessionDate: today,
      sessionType: "teletherapy",
    });

    const records = await t.query(api.billingRecords.listByPatient, { patientId });
    expect(records[0].modifiers).toContain("GP");
    expect(records[0].modifiers).toContain("95");
    expect(records[0].placeOfService).toBe("02");
  });

  it("populates fee from practice profile defaultSessionFee", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);

    await t.mutation(api.practiceProfiles.upsert, {
      defaultSessionFee: 15000,
    });

    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      slpUserId: "slp-user-billing",
      patientId,
      sessionDate: today,
      sessionType: "in-person",
    });

    const records = await t.query(api.billingRecords.listByPatient, { patientId });
    expect(records[0].fee).toBe(15000);
  });
});
