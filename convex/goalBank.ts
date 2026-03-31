import { ConvexError, v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { slpMutation, slpQuery } from "./lib/customFunctions";
import { GOAL_BANK_SEED } from "./lib/goalBankSeed";

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

const ageRangeValidator = v.union(
  v.literal("0-3"),
  v.literal("3-5"),
  v.literal("5-8"),
  v.literal("8-12"),
  v.literal("12-18"),
  v.literal("adult")
);

// ── Internal Mutations ──────────────────────────────────────────────────────

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Idempotency: skip if any system goal already exists
    const existing = await ctx.db
      .query("goalBank")
      .withIndex("by_domain", (q) => q.eq("domain", "articulation"))
      .filter((q) => q.eq(q.field("isCustom"), false))
      .first();

    if (existing) return;

    for (const entry of GOAL_BANK_SEED) {
      await ctx.db.insert("goalBank", {
        ...entry,
        isCustom: false,
      });
    }
  },
});

// ── Queries ─────────────────────────────────────────────────────────────────

export const search = slpQuery({
  args: {
    domain: v.optional(domainValidator),
    ageRange: v.optional(ageRangeValidator),
    skillLevel: v.optional(v.string()),
    keyword: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");

    let results;

    if (args.domain && args.ageRange) {
      results = await ctx.db
        .query("goalBank")
        .withIndex("by_domain_ageRange", (q) =>
          q.eq("domain", args.domain!).eq("ageRange", args.ageRange!)
        )
        .take(200);
    } else if (args.domain && args.skillLevel) {
      results = await ctx.db
        .query("goalBank")
        .withIndex("by_domain_skillLevel", (q) =>
          q.eq("domain", args.domain!).eq("skillLevel", args.skillLevel!)
        )
        .take(200);
    } else if (args.domain) {
      results = await ctx.db
        .query("goalBank")
        .withIndex("by_domain", (q) => q.eq("domain", args.domain!))
        .take(200);
    } else {
      results = await ctx.db.query("goalBank").collect();
    }

    // Apply keyword filter
    if (args.keyword) {
      const kw = args.keyword.toLowerCase();
      results = results.filter(
        (g) =>
          g.shortDescription.toLowerCase().includes(kw) ||
          g.fullGoalText.toLowerCase().includes(kw)
      );
    }

    // Apply skillLevel filter when not already applied via index
    if (args.skillLevel && !args.domain) {
      results = results.filter((g) => g.skillLevel === args.skillLevel);
    }

    // Always include the SLP's own custom goals (not already in results)
    const customGoals = await ctx.db
      .query("goalBank")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", ctx.slpUserId ?? undefined))
      .collect();

    const resultIds = new Set(results.map((g) => g._id));
    for (const goal of customGoals) {
      if (!resultIds.has(goal._id)) {
        // Only add if no domain/ageRange/skillLevel filter would exclude it
        if (args.domain && goal.domain !== args.domain) continue;
        if (args.ageRange && goal.ageRange !== args.ageRange) continue;
        if (args.skillLevel && goal.skillLevel !== args.skillLevel) continue;
        if (args.keyword) {
          const kw = args.keyword.toLowerCase();
          if (!goal.shortDescription.toLowerCase().includes(kw) && !goal.fullGoalText.toLowerCase().includes(kw)) continue;
        }
        results.push(goal);
      }
    }

    return results;
  },
});

export const listDomainSkillLevels = slpQuery({
  args: { domain: domainValidator },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");

    const goals = await ctx.db
      .query("goalBank")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .take(200);

    const levels = [...new Set(goals.map((g) => g.skillLevel))];
    return levels.sort();
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const addCustom = slpMutation({
  args: {
    domain: domainValidator,
    ageRange: ageRangeValidator,
    skillLevel: v.string(),
    shortDescription: v.string(),
    fullGoalText: v.string(),
    defaultTargetAccuracy: v.number(),
    defaultConsecutiveSessions: v.number(),
    exampleBaseline: v.optional(v.string()),
    typicalCriterion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const desc = args.shortDescription.trim();
    if (desc.length === 0 || desc.length > 200) {
      throw new ConvexError("Short description must be 1-200 characters");
    }

    return await ctx.db.insert("goalBank", {
      domain: args.domain,
      ageRange: args.ageRange,
      skillLevel: args.skillLevel,
      shortDescription: desc,
      fullGoalText: args.fullGoalText.trim(),
      defaultTargetAccuracy: args.defaultTargetAccuracy,
      defaultConsecutiveSessions: args.defaultConsecutiveSessions,
      exampleBaseline: args.exampleBaseline,
      typicalCriterion: args.typicalCriterion,
      isCustom: true,
      createdBy: ctx.slpUserId,
    });
  },
});

export const removeCustom = slpMutation({
  args: { goalId: v.id("goalBank") },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (!goal.isCustom) throw new ConvexError("Cannot remove system goals");
    if (goal.createdBy !== ctx.slpUserId) throw new ConvexError("Not authorized");

    await ctx.db.delete(args.goalId);
  },
});
