import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { slpMutation, slpQuery } from "./lib/customFunctions";

const domainValidator = v.union(
  v.literal("articulation"),
  v.literal("language-receptive"),
  v.literal("language-expressive"),
  v.literal("fluency"),
  v.literal("voice"),
  v.literal("pragmatic-social"),
  v.literal("aac"),
  v.literal("feeding")
);

const trendValidator = v.union(
  v.literal("improving"),
  v.literal("stable"),
  v.literal("declining")
);

const goalStatusValidator = v.union(
  v.literal("active"),
  v.literal("met"),
  v.literal("discontinued"),
  v.literal("modified")
);

const reportTypeValidator = v.union(
  v.literal("weekly-summary"),
  v.literal("monthly-summary"),
  v.literal("iep-progress-report")
);

const goalSummaryValidator = v.object({
  goalId: v.string(),
  shortDescription: v.string(),
  domain: domainValidator,
  accuracyTrend: trendValidator,
  averageAccuracy: v.number(),
  sessionsCount: v.number(),
  status: goalStatusValidator,
  narrative: v.string(),
});

// ── Queries ─────────────────────────────────────────────────────────────────

export const list = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("progressReports")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(100);
  },
});

export const get = slpQuery({
  args: { reportId: v.id("progressReports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("Report not found");
    if (report.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    return report;
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const create = slpMutation({
  args: {
    patientId: v.id("patients"),
    reportType: reportTypeValidator,
    periodStart: v.string(),
    periodEnd: v.string(),
    goalSummaries: v.array(goalSummaryValidator),
    overallNarrative: v.string(),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db.insert("progressReports", {
      patientId: args.patientId,
      slpUserId: ctx.slpUserId,
      reportType: args.reportType,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      goalSummaries: args.goalSummaries,
      overallNarrative: args.overallNarrative,
      status: "draft",
    });
  },
});

export const updateNarrative = slpMutation({
  args: {
    reportId: v.id("progressReports"),
    goalSummaries: v.optional(v.array(goalSummaryValidator)),
    overallNarrative: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("Report not found");
    if (report.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (report.status === "signed") {
      throw new ConvexError("Cannot edit a signed report");
    }

    const updates: Record<string, unknown> = {};
    if (args.goalSummaries !== undefined) updates.goalSummaries = args.goalSummaries;
    if (args.overallNarrative !== undefined) updates.overallNarrative = args.overallNarrative;
    await ctx.db.patch(args.reportId, updates);
  },
});

export const markReviewed = slpMutation({
  args: { reportId: v.id("progressReports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("Report not found");
    if (report.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (report.status !== "draft") {
      throw new ConvexError("Only draft reports can be marked as reviewed");
    }
    await ctx.db.patch(args.reportId, { status: "reviewed" });
  },
});

export const sign = slpMutation({
  args: { reportId: v.id("progressReports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("Report not found");
    if (report.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (report.status !== "reviewed") {
      throw new ConvexError("Only reviewed reports can be signed");
    }
    if (report.goalSummaries.length === 0) {
      throw new ConvexError("Report must contain at least one goal summary");
    }

    const now = Date.now();
    await ctx.db.patch(args.reportId, { status: "signed", signedAt: now });

    await ctx.db.insert("activityLog", {
      patientId: report.patientId,
      actorUserId: ctx.slpUserId,
      action: "report-generated",
      details: `Signed ${report.reportType} report (${report.periodStart} to ${report.periodEnd})`,
      timestamp: now,
    });
  },
});

export const unsign = slpMutation({
  args: { reportId: v.id("progressReports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("Report not found");
    if (report.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (report.status !== "signed") {
      throw new ConvexError("Only signed reports can be unsigned");
    }
    await ctx.db.patch(args.reportId, { status: "reviewed", signedAt: undefined });
  },
});
