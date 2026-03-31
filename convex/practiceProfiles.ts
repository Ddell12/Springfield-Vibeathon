import { v } from "convex/values";

import { slpMutation, slpQuery } from "./lib/customFunctions";

export const get = slpQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.slpUserId) return null;
    return await ctx.db
      .query("practiceProfiles")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", ctx.slpUserId!))
      .first();
  },
});

export const upsert = slpMutation({
  args: {
    practiceName: v.optional(v.string()),
    npiNumber: v.optional(v.string()),
    taxId: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    credentials: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    defaultSessionFee: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("practiceProfiles")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", ctx.slpUserId))
      .first();

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (args.practiceName !== undefined) updates.practiceName = args.practiceName;
      if (args.npiNumber !== undefined) updates.npiNumber = args.npiNumber;
      if (args.taxId !== undefined) updates.taxId = args.taxId;
      if (args.address !== undefined) updates.address = args.address;
      if (args.phone !== undefined) updates.phone = args.phone;
      if (args.credentials !== undefined) updates.credentials = args.credentials;
      if (args.licenseNumber !== undefined) updates.licenseNumber = args.licenseNumber;
      if (args.defaultSessionFee !== undefined) updates.defaultSessionFee = args.defaultSessionFee;
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    return await ctx.db.insert("practiceProfiles", {
      slpUserId: ctx.slpUserId,
      ...args,
    });
  },
});
