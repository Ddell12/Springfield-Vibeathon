import { v } from "convex/values";

import { query } from "./_generated/server";
import { slpMutation, slpQuery } from "./lib/customFunctions";

export const update = slpMutation({
  args: {
    practiceName: v.optional(v.string()),
    practiceAddress: v.optional(v.string()),
    practicePhone: v.optional(v.string()),
    npiNumber: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    licenseState: v.optional(v.string()),
    taxId: v.optional(v.string()),
    credentials: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = ctx.slpUserId;
    const existing = await ctx.db
      .query("practiceProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("practiceProfiles", {
        userId,
        ...args,
      });
    }
  },
});

export const get = slpQuery({
  args: {},
  handler: async (ctx) => {
    const userId = ctx.slpUserId;
    if (!userId) return null;
    return await ctx.db
      .query("practiceProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const getBySlpId = query({
  args: { slpUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("practiceProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.slpUserId))
      .first();
  },
});
