import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");
const SLP_IDENTITY = { subject: "slp-user-123", issuer: "https://test.convex.dev" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "https://test.convex.dev" };

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

const VALID_GOAL_SUMMARY = {
  goalId: "placeholder",
  shortDescription: "Produce /r/ in initial position",
  domain: "articulation" as const,
  accuracyTrend: "improving" as const,
  averageAccuracy: 75,
  sessionsCount: 5,
  status: "active" as const,
  narrative: "Patient is making steady progress.",
};

async function createReportSetup(t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>) {
  const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
  const reportId = await t.mutation(api.progressReports.create, {
    patientId,
    reportType: "weekly-summary" as const,
    periodStart: "2026-03-21",
    periodEnd: "2026-03-28",
    goalSummaries: [VALID_GOAL_SUMMARY],
    overallNarrative: "Overall good progress this week.",
  });
  return { patientId, reportId };
}

describe("progressReports sign workflow", () => {
  it("creates draft report", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { reportId } = await createReportSetup(t);
    const report = await t.query(api.progressReports.get, { reportId });
    expect(report.status).toBe("draft");
  });

  it("transitions draft -> reviewed -> signed -> unsigned", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { reportId } = await createReportSetup(t);

    await t.mutation(api.progressReports.markReviewed, { reportId });
    let report = await t.query(api.progressReports.get, { reportId });
    expect(report.status).toBe("reviewed");

    await t.mutation(api.progressReports.sign, { reportId });
    report = await t.query(api.progressReports.get, { reportId });
    expect(report.status).toBe("signed");
    expect(report.signedAt).toBeDefined();

    await t.mutation(api.progressReports.unsign, { reportId });
    report = await t.query(api.progressReports.get, { reportId });
    expect(report.status).toBe("reviewed");
    expect(report.signedAt).toBeUndefined();
  });

  it("cannot sign a draft (must review first)", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { reportId } = await createReportSetup(t);
    await expect(
      t.mutation(api.progressReports.sign, { reportId })
    ).rejects.toThrow("Only reviewed reports can be signed");
  });

  it("cannot edit a signed report", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { reportId } = await createReportSetup(t);
    await t.mutation(api.progressReports.markReviewed, { reportId });
    await t.mutation(api.progressReports.sign, { reportId });
    await expect(
      t.mutation(api.progressReports.updateNarrative, {
        reportId, overallNarrative: "Changed",
      })
    ).rejects.toThrow("Cannot edit a signed report");
  });

  it("rejects other SLP access", async () => {
    const base = convexTest(schema, modules);
    const t1 = base.withIdentity(SLP_IDENTITY);
    const { reportId } = await createReportSetup(t1);
    const t2 = base.withIdentity(OTHER_SLP);
    await expect(
      t2.query(api.progressReports.get, { reportId })
    ).rejects.toThrow("Not authorized");
  });
});

describe("progressReports audience", () => {
  it("stores audience when provided", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);

    const reportId = await t.mutation(api.progressReports.create, {
      patientId,
      reportType: "weekly-summary" as const,
      periodStart: "2026-03-21",
      periodEnd: "2026-03-28",
      goalSummaries: [VALID_GOAL_SUMMARY],
      overallNarrative: "Good progress.",
      audience: "parent" as const,
    });

    const report = await t.query(api.progressReports.get, { reportId });
    expect(report.audience).toBe("parent");
  });

  it("defaults to undefined when audience is omitted (backward compat)", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { reportId } = await createReportSetup(t);
    const report = await t.query(api.progressReports.get, { reportId });
    expect(report.audience).toBeUndefined();
  });
});
