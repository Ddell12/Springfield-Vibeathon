import { v } from "convex/values";

import { authedQuery, slpMutation } from "./lib/customFunctions";

export const list = authedQuery({
  args: {
    slpId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!ctx.userId) return [];

    const targetSlpId = args.slpId ?? ctx.userId;

    return await ctx.db
      .query("availability")
      .withIndex("by_slpId", (q) => q.eq("slpId", targetSlpId))
      .collect();
  },
});

export const create = slpMutation({
  args: {
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    isRecurring: v.boolean(),
    effectiveDate: v.optional(v.string()),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
      throw new Error("dayOfWeek must be 0-6");
    }
    if (args.startTime >= args.endTime) {
      throw new Error("startTime must be before endTime");
    }

    return await ctx.db.insert("availability", {
      slpId: ctx.slpUserId,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      isRecurring: args.isRecurring,
      effectiveDate: args.effectiveDate,
      timezone: args.timezone,
    });
  },
});

export const remove = slpMutation({
  args: {
    availabilityId: v.id("availability"),
  },
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.availabilityId);
    if (!slot) throw new Error("Availability slot not found");
    if (slot.slpId !== ctx.slpUserId) throw new Error("Not authorized");

    await ctx.db.delete(args.availabilityId);
  },
});
