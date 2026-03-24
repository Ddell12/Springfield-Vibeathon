import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const get = query({
  args: {
    projectId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("toolState")
      .withIndex("by_projectId_key", (q) =>
        q.eq("projectId", args.projectId).eq("key", args.key)
      )
      .first();
    return doc ?? null;
  },
});

export const set = mutation({
  args: {
    projectId: v.string(),
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("toolState")
      .withIndex("by_projectId_key", (q) =>
        q.eq("projectId", args.projectId).eq("key", args.key)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("toolState", {
        projectId: args.projectId,
        key: args.key,
        value: args.value,
        updatedAt: Date.now(),
      });
    }
  },
});
