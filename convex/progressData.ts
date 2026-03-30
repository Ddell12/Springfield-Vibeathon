import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { mutation, query } from "./_generated/server";
import { assertSLP } from "./lib/auth";

const promptLevelValidator = v.optional(v.union(
  v.literal("independent"),
  v.literal("verbal-cue"),
  v.literal("model"),
  v.literal("physical")
));

// ── Queries ─────────────────────────────────────────────────────────────────

export const listByGoal = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (goal.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("progressData")
      .withIndex("by_goalId_date", (q) => q.eq("goalId", args.goalId))
      .order("desc")
      .take(200);
  },
});

export const listByPatient = query({
  args: {
    patientId: v.id("patients"),
    periodStart: v.string(),
    periodEnd: v.string(),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("progressData")
      .withIndex("by_patientId_date", (q) =>
        q.eq("patientId", args.patientId)
          .gte("date", args.periodStart)
          .lte("date", args.periodEnd)
      )
      .take(200);
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const createManual = mutation({
  args: {
    goalId: v.id("goals"),
    date: v.string(),
    trials: v.optional(v.number()),
    correct: v.optional(v.number()),
    accuracy: v.number(),
    promptLevel: promptLevelValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (goal.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    if (!Number.isFinite(args.accuracy) || args.accuracy < 0 || args.accuracy > 100) {
      throw new ConvexError("Accuracy must be between 0 and 100");
    }
    if (args.trials !== undefined && args.correct !== undefined && args.correct > args.trials) {
      throw new ConvexError("Correct cannot exceed total trials");
    }
    const date = new Date(args.date);
    if (isNaN(date.getTime())) {
      throw new ConvexError("Invalid date");
    }

    return await ctx.db.insert("progressData", {
      goalId: args.goalId,
      patientId: goal.patientId,
      source: "manual-entry",
      date: args.date,
      trials: args.trials,
      correct: args.correct,
      accuracy: args.accuracy,
      promptLevel: args.promptLevel,
      notes: args.notes,
      timestamp: Date.now(),
    });
  },
});
