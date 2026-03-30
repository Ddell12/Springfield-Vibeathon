import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { assertSLP, getAuthUserId } from "./lib/auth";

export const list = query({
  args: {
    slpId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const targetSlpId = args.slpId ?? userId;

    return await ctx.db
      .query("availability")
      .withIndex("by_slpId", (q) => q.eq("slpId", targetSlpId))
      .collect();
  },
});

export const create = mutation({
  args: {
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    isRecurring: v.boolean(),
    effectiveDate: v.optional(v.string()),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const slpId = await assertSLP(ctx);

    if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
      throw new Error("dayOfWeek must be 0-6");
    }
    if (args.startTime >= args.endTime) {
      throw new Error("startTime must be before endTime");
    }

    return await ctx.db.insert("availability", {
      slpId,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      isRecurring: args.isRecurring,
      effectiveDate: args.effectiveDate,
      timezone: args.timezone,
    });
  },
});

export const remove = mutation({
  args: {
    availabilityId: v.id("availability"),
  },
  handler: async (ctx, args) => {
    const slpId = await assertSLP(ctx);
    const slot = await ctx.db.get(args.availabilityId);
    if (!slot) throw new Error("Availability slot not found");
    if (slot.slpId !== slpId) throw new Error("Not authorized");

    await ctx.db.delete(args.availabilityId);
  },
});
