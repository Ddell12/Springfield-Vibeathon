import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { assertSLP, assertPatientAccess } from "./lib/auth";

// ── Validators ──────────────────────────────────────────────────────────────

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

const statusValidator = v.union(
  v.literal("active"),
  v.literal("met"),
  v.literal("discontinued"),
  v.literal("modified")
);

// ── Validation Helpers ──────────────────────────────────────────────────────

function validateGoalFields(args: {
  shortDescription: string;
  fullGoalText: string;
  targetAccuracy: number;
  targetConsecutiveSessions: number;
  startDate: string;
  targetDate?: string;
}): void {
  const desc = args.shortDescription.trim();
  if (desc.length === 0 || desc.length > 200) {
    throw new ConvexError("Short description must be 1-200 characters");
  }
  const full = args.fullGoalText.trim();
  if (full.length === 0 || full.length > 2000) {
    throw new ConvexError("Full goal text must be 1-2000 characters");
  }
  if (!Number.isFinite(args.targetAccuracy) || args.targetAccuracy < 1 || args.targetAccuracy > 100) {
    throw new ConvexError("Target accuracy must be between 1 and 100");
  }
  if (!Number.isInteger(args.targetConsecutiveSessions) || args.targetConsecutiveSessions < 1 || args.targetConsecutiveSessions > 10) {
    throw new ConvexError("Target consecutive sessions must be between 1 and 10");
  }
  const date = new Date(args.startDate);
  if (isNaN(date.getTime())) {
    throw new ConvexError("Invalid start date");
  }
  if (args.targetDate !== undefined) {
    const target = new Date(args.targetDate);
    if (isNaN(target.getTime())) {
      throw new ConvexError("Invalid target date");
    }
  }
}

// ── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("goals")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

export const listActive = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("goals")
      .withIndex("by_patientId_status", (q) =>
        q.eq("patientId", args.patientId).eq("status", "active")
      )
      .collect();
  },
});

/** Dual-role query: both SLP and linked caregiver can view goals. */
export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);
    return await ctx.db
      .query("goals")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

export const get = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (goal.slpUserId !== slpUserId) throw new ConvexError("Not authorized");
    return goal;
  },
});

export const getWithProgress = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (goal.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    const progressData = await ctx.db
      .query("progressData")
      .withIndex("by_goalId_date", (q) => q.eq("goalId", args.goalId))
      .order("desc")
      .take(20);

    return { goal, progressData };
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    patientId: v.id("patients"),
    domain: domainValidator,
    shortDescription: v.string(),
    fullGoalText: v.string(),
    targetAccuracy: v.number(),
    targetConsecutiveSessions: v.number(),
    startDate: v.string(),
    targetDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    validateGoalFields(args);

    const goalId = await ctx.db.insert("goals", {
      patientId: args.patientId,
      slpUserId,
      domain: args.domain,
      shortDescription: args.shortDescription.trim(),
      fullGoalText: args.fullGoalText.trim(),
      targetAccuracy: args.targetAccuracy,
      targetConsecutiveSessions: args.targetConsecutiveSessions,
      status: "active",
      startDate: args.startDate,
      targetDate: args.targetDate,
      notes: args.notes,
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: slpUserId,
      action: "goal-created",
      details: `Created goal: ${args.shortDescription.trim()}`,
      timestamp: Date.now(),
    });

    return goalId;
  },
});

export const update = mutation({
  args: {
    goalId: v.id("goals"),
    domain: v.optional(domainValidator),
    shortDescription: v.optional(v.string()),
    fullGoalText: v.optional(v.string()),
    targetAccuracy: v.optional(v.number()),
    targetConsecutiveSessions: v.optional(v.number()),
    startDate: v.optional(v.string()),
    targetDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (goal.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    if (goal.status === "met") {
      if (args.status === undefined) {
        throw new ConvexError("Cannot edit a met goal — change status to 'modified' first");
      }
      if (args.status !== "modified" && args.status !== "discontinued") {
        throw new ConvexError("Met goals can only be changed to 'modified' or 'discontinued'");
      }
    }

    const merged = {
      shortDescription: args.shortDescription ?? goal.shortDescription,
      fullGoalText: args.fullGoalText ?? goal.fullGoalText,
      targetAccuracy: args.targetAccuracy ?? goal.targetAccuracy,
      targetConsecutiveSessions: args.targetConsecutiveSessions ?? goal.targetConsecutiveSessions,
      startDate: args.startDate ?? goal.startDate,
      targetDate: args.targetDate ?? goal.targetDate,
    };
    validateGoalFields(merged);

    const updates: Record<string, unknown> = {};
    if (args.domain !== undefined) updates.domain = args.domain;
    if (args.shortDescription !== undefined) updates.shortDescription = args.shortDescription.trim();
    if (args.fullGoalText !== undefined) updates.fullGoalText = args.fullGoalText.trim();
    if (args.targetAccuracy !== undefined) updates.targetAccuracy = args.targetAccuracy;
    if (args.targetConsecutiveSessions !== undefined) updates.targetConsecutiveSessions = args.targetConsecutiveSessions;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.targetDate !== undefined) updates.targetDate = args.targetDate;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.goalId, updates);

    if (args.status === "met") {
      await ctx.db.insert("activityLog", {
        patientId: goal.patientId,
        actorUserId: slpUserId,
        action: "goal-met",
        details: `Goal met: ${goal.shortDescription}`,
        timestamp: Date.now(),
      });
    } else if (args.status === "modified" || args.status === "discontinued") {
      await ctx.db.insert("activityLog", {
        patientId: goal.patientId,
        actorUserId: slpUserId,
        action: "goal-modified",
        details: `Goal ${args.status}: ${goal.shortDescription}`,
        timestamp: Date.now(),
      });
    }
  },
});

export const remove = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (goal.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    await ctx.db.patch(args.goalId, { status: "discontinued" });

    await ctx.db.insert("activityLog", {
      patientId: goal.patientId,
      actorUserId: slpUserId,
      action: "goal-modified",
      details: `Goal discontinued: ${goal.shortDescription}`,
      timestamp: Date.now(),
    });
  },
});
