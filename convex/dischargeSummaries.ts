import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { slpMutation, slpQuery } from "./lib/customFunctions";

// ── Validators ──────────────────────────────────────────────────────────────

const goalAchievedValidator = v.object({
  goalId: v.string(),
  shortDescription: v.string(),
  finalAccuracy: v.number(),
});

const goalNotMetValidator = v.object({
  goalId: v.string(),
  shortDescription: v.string(),
  finalAccuracy: v.number(),
  reason: v.string(),
});

const dischargeReasonValidator = v.union(
  v.literal("goals-met"),
  v.literal("plateau"),
  v.literal("family-request"),
  v.literal("insurance-exhausted"),
  v.literal("transition"),
  v.literal("other")
);

// ── Queries ─────────────────────────────────────────────────────────────────

export const get = slpQuery({
  args: { dischargeId: v.id("dischargeSummaries") },
  handler: async (ctx, args) => {
    const discharge = await ctx.db.get(args.dischargeId);
    if (!discharge) throw new ConvexError("Discharge summary not found");
    if (discharge.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    return discharge;
  },
});

export const getByPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("dischargeSummaries")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const create = slpMutation({
  args: {
    patientId: v.id("patients"),
    serviceStartDate: v.string(),
    serviceEndDate: v.string(),
    presentingDiagnosis: v.string(),
    goalsAchieved: v.array(goalAchievedValidator),
    goalsNotMet: v.array(goalNotMetValidator),
    dischargeReason: dischargeReasonValidator,
    dischargeReasonOther: v.optional(v.string()),
    narrative: v.string(),
    recommendations: v.string(),
    returnCriteria: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db.insert("dischargeSummaries", {
      patientId: args.patientId,
      slpUserId: ctx.slpUserId,
      serviceStartDate: args.serviceStartDate,
      serviceEndDate: args.serviceEndDate,
      presentingDiagnosis: args.presentingDiagnosis,
      goalsAchieved: args.goalsAchieved,
      goalsNotMet: args.goalsNotMet,
      dischargeReason: args.dischargeReason,
      dischargeReasonOther: args.dischargeReasonOther,
      narrative: args.narrative,
      recommendations: args.recommendations,
      returnCriteria: args.returnCriteria,
      status: "draft",
    });
  },
});

export const update = slpMutation({
  args: {
    dischargeId: v.id("dischargeSummaries"),
    serviceStartDate: v.optional(v.string()),
    serviceEndDate: v.optional(v.string()),
    presentingDiagnosis: v.optional(v.string()),
    goalsAchieved: v.optional(v.array(goalAchievedValidator)),
    goalsNotMet: v.optional(v.array(goalNotMetValidator)),
    dischargeReason: v.optional(dischargeReasonValidator),
    dischargeReasonOther: v.optional(v.string()),
    narrative: v.optional(v.string()),
    recommendations: v.optional(v.string()),
    returnCriteria: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const discharge = await ctx.db.get(args.dischargeId);
    if (!discharge) throw new ConvexError("Discharge summary not found");
    if (discharge.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (discharge.status === "signed") {
      throw new ConvexError("Cannot edit a signed discharge summary");
    }

    const { dischargeId, ...updates } = args;
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filtered[key] = value;
    }
    await ctx.db.patch(args.dischargeId, filtered);
  },
});

export const sign = slpMutation({
  args: { dischargeId: v.id("dischargeSummaries") },
  handler: async (ctx, args) => {
    const discharge = await ctx.db.get(args.dischargeId);
    if (!discharge) throw new ConvexError("Discharge summary not found");
    if (discharge.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (discharge.status === "signed") {
      throw new ConvexError("Discharge summary is already signed");
    }

    const now = Date.now();
    await ctx.db.patch(args.dischargeId, { status: "signed", signedAt: now });

    await ctx.db.insert("activityLog", {
      patientId: discharge.patientId,
      actorUserId: ctx.slpUserId,
      action: "discharge-signed",
      details: `Signed discharge summary (${discharge.dischargeReason})`,
      timestamp: now,
    });
  },
});

export const saveFromAI = slpMutation({
  args: {
    dischargeId: v.id("dischargeSummaries"),
    narrative: v.string(),
    recommendations: v.string(),
  },
  handler: async (ctx, args) => {
    const discharge = await ctx.db.get(args.dischargeId);
    if (!discharge) throw new ConvexError("Discharge summary not found");
    if (discharge.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (discharge.status === "signed") {
      throw new ConvexError("Cannot edit a signed discharge summary");
    }

    await ctx.db.patch(args.dischargeId, {
      narrative: args.narrative,
      recommendations: args.recommendations,
    });
  },
});
