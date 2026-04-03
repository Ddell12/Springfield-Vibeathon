import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";
import { createTestPatient, suppressSchedulerErrors } from "./testHelpers";

suppressSchedulerErrors();

const modules = import.meta.glob("../**/*.ts");

describe("appointments developer gate", () => {
  it("rejects developer shortcut when identity is not allowlisted", async () => {
    vi.stubEnv("DEVELOPER_ALLOWLIST", "dev@bridges.ai");
    const t = convexTest(schema, modules).withIdentity({
      subject: "slp-user-123",
      issuer: "clerk",
      email: "other@bridges.ai",
    });

    await expect(
      t.mutation(api.appointments.startDeveloperTestCall, {})
    ).rejects.toThrow("Developer shortcuts are not enabled");
  });

  it("persists testMetadata on developer-created appointments", async () => {
    vi.stubEnv("DEVELOPER_ALLOWLIST", "dev@bridges.ai");
    const t = convexTest(schema, modules).withIdentity({
      subject: "slp-user-123",
      issuer: "clerk",
      email: "dev@bridges.ai",
    });

    const appointmentId = await t.mutation(api.appointments.startDeveloperTestCall, {});
    const appointment = await t.run((ctx) => ctx.db.get(appointmentId));
    const patient = appointment ? await t.run((ctx) => ctx.db.get(appointment.patientId)) : null;
    expect(patient?.testMetadata?.source).toBe("developer-shortcut");

    expect(appointment?.testMetadata?.source).toBe("developer-shortcut");
    expect(appointment?.testMetadata?.createdByUserId).toBe("slp-user-123");
    expect(appointment?.testMetadata?.expiresAt).toBeTypeOf("number");
  });

  it("copies appointment testMetadata into meeting records on completion", async () => {
    vi.stubEnv("DEVELOPER_ALLOWLIST", "dev@bridges.ai");
    const t = convexTest(schema, modules);
    const slp = t.withIdentity({ subject: "slp-user-123", issuer: "clerk", email: "dev@bridges.ai" });

    // Create a developer test call appointment
    const appointmentId = await slp.mutation(api.appointments.startDeveloperTestCall, {});

    // Complete the session
    const meetingRecordId = await slp.mutation(api.appointments.completeSession, {
      appointmentId,
      durationSeconds: 600,
    });

    const meetingRecord = await t.run((ctx) => ctx.db.get(meetingRecordId));
    expect(meetingRecord?.testMetadata?.source).toBe("developer-shortcut");
  });

  it("creates a synthetic patient and joinable appointment for the current SLP", async () => {
    vi.stubEnv("DEVELOPER_ALLOWLIST", "dev@bridges.ai");
    const t = convexTest(schema, modules).withIdentity({
      subject: "slp-user-123",
      issuer: "clerk",
      email: "dev@bridges.ai",
    });

    const appointmentId = await t.mutation(api.appointments.startDeveloperTestCall, {});
    const appointment = await t.run((ctx) => ctx.db.get(appointmentId));
    const patient = appointment ? await t.run((ctx) => ctx.db.get(appointment.patientId)) : null;

    expect(appointment?.status).toBe("scheduled");
    expect(appointment?.joinLink).toBe(`/sessions/${appointmentId}/call`);
    expect(patient?.testMetadata?.source).toBe("developer-shortcut");
  });
});

describe("appointments access fallbacks", () => {
  it("returns null from get when the signed-in user cannot access the patient", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createTestPatient(t, { slpUserId: "slp-owner-123" });
    const appointmentId = await t.run((ctx) =>
      ctx.db.insert("appointments", {
        slpId: "slp-owner-123",
        patientId,
        scheduledAt: Date.now() + 60_000,
        duration: 30,
        status: "scheduled",
        joinLink: "/sessions/test/call",
      })
    );

    const outsider = t.withIdentity({
      subject: "different-user-456",
      issuer: "clerk",
      email: "outsider@bridges.ai",
    });

    await expect(
      outsider.query(api.appointments.get, { appointmentId })
    ).resolves.toBeNull();
  });

  it("returns an empty list from listByPatient when the signed-in user cannot access the patient", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createTestPatient(t, { slpUserId: "slp-owner-123" });
    await t.run((ctx) =>
      ctx.db.insert("appointments", {
        slpId: "slp-owner-123",
        patientId,
        scheduledAt: Date.now() + 60_000,
        duration: 30,
        status: "scheduled",
        joinLink: "/sessions/test/call",
      })
    );

    const outsider = t.withIdentity({
      subject: "different-user-456",
      issuer: "clerk",
      email: "outsider@bridges.ai",
    });

    await expect(
      outsider.query(api.appointments.listByPatient, { patientId })
    ).resolves.toEqual([]);
  });
});
