import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { suppressSchedulerErrors } from "./testHelpers";

const modules = import.meta.glob("../**/*.*s");

suppressSchedulerErrors();

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const STRANGER = { subject: "stranger-000", issuer: "clerk" };

async function setupPatientWithApp(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, {
    firstName: "Ace",
    lastName: "Smith",
    dateOfBirth: "2020-06-15",
    diagnosis: "articulation" as const,
  });

  const sessionId = await slp.mutation(api.sessions.create, {
    title: "Test Therapy App",
    query: "Build a therapy app",
  });
  const app = await slp.mutation(api.apps.ensureForSession, {
    sessionId,
    title: "Test Therapy App",
  });
  const appId = app!._id;

  await slp.mutation(api.generated_files.upsert, {
    sessionId,
    path: "_bundle.html",
    contents: "<html><body>Test App</body></html>",
    version: 1,
  });

  return { patientId, sessionId, appId };
}

describe("childApps.assign", () => {
  it("SLP can assign an app to a child", async () => {
    const t = convexTest(schema, modules);
    const { patientId, appId } = await setupPatientWithApp(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const id = await slp.mutation(api.childApps.assign, { patientId, appId });
    expect(id).toBeDefined();

    const apps = await slp.query(api.childApps.listByPatient, { patientId });
    expect(apps).toHaveLength(1);
    expect(apps[0].appId).toBe(appId);
    expect(apps[0].assignedByRole).toBe("slp");
  });

  it("stranger cannot assign an app", async () => {
    const t = convexTest(schema, modules);
    const { patientId, appId } = await setupPatientWithApp(t);
    const stranger = t.withIdentity(STRANGER);

    await expect(
      stranger.mutation(api.childApps.assign, { patientId, appId })
    ).rejects.toThrow();
  });
});

describe("childApps.remove", () => {
  it("removes an assigned app", async () => {
    const t = convexTest(schema, modules);
    const { patientId, appId } = await setupPatientWithApp(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const id = await slp.mutation(api.childApps.assign, { patientId, appId });
    await slp.mutation(api.childApps.remove, { childAppId: id });

    const apps = await slp.query(api.childApps.listByPatient, { patientId });
    expect(apps).toHaveLength(0);
  });
});

describe("childApps.getBundleForApp", () => {
  it("returns bundle HTML for an assigned app", async () => {
    const t = convexTest(schema, modules);
    const { patientId, appId } = await setupPatientWithApp(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.childApps.assign, { patientId, appId });

    const bundle = await slp.query(api.childApps.getBundleForApp, { patientId, appId });
    expect(bundle).toBe("<html><body>Test App</body></html>");
  });

  it("returns null for unassigned app", async () => {
    const t = convexTest(schema, modules);
    const { patientId, appId } = await setupPatientWithApp(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const bundle = await slp.query(api.childApps.getBundleForApp, { patientId, appId });
    expect(bundle).toBeNull();
  });
});

describe("childApps schema", () => {
  it("childApps table exists in schema", () => {
    expect(schema.tables.childApps).toBeDefined();
  });

  it("caregiverLinks accepts kidModePIN field", async () => {
    const t = convexTest(schema, modules);
    const slpId = { subject: "slp-1", issuer: "clerk" };
    const slp = t.withIdentity(slpId);

    const { patientId } = await slp.mutation(api.patients.create, {
      firstName: "Test",
      lastName: "Child",
      dateOfBirth: "2020-01-01",
      diagnosis: "articulation" as const,
    });

    const linkId = await t.run(async (ctx) => {
      return await ctx.db.insert("caregiverLinks", {
        patientId,
        email: "parent@test.com",
        inviteToken: "test-token-12345678",
        inviteStatus: "pending",
        kidModePIN: "hashed-pin-value",
      });
    });
    const link = await t.run(async (ctx) => ctx.db.get(linkId));
    expect(link?.kidModePIN).toBe("hashed-pin-value");
  });
});
