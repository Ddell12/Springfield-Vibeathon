import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

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
