import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";

export const getByHash = internalQuery({
  args: { promptHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("imageCache")
      .withIndex("by_promptHash", (q) => q.eq("promptHash", args.promptHash))
      .first();
  },
});

export const save = internalMutation({
  args: {
    promptHash: v.string(),
    prompt: v.string(),
    label: v.string(),
    category: v.string(),
    storageId: v.id("_storage"),
    imageUrl: v.string(),
    model: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("imageCache", args);
  },
});

export const hasAny = internalQuery({
  args: {},
  handler: async (ctx) => {
    const entry = await ctx.db.query("imageCache").first();
    return entry !== null;
  },
});
