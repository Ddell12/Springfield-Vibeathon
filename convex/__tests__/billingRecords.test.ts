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
