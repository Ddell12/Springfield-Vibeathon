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

import { api } from "../_generated/api";

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
