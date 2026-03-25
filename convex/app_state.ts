import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {
    appId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appState")
      .withIndex("by_app_key", (q) =>
        q.eq("appId", args.appId).eq("key", args.key)
      )
      .first();
  },
});

export const set = mutation({
  args: {
    appId: v.string(),
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("appState")
      .withIndex("by_app_key", (q) =>
        q.eq("appId", args.appId).eq("key", args.key)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("appState", {
        appId: args.appId,
        key: args.key,
        value: args.value,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getAll = query({
  args: { appId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appState")
      .withIndex("by_app_key", (q) => q.eq("appId", args.appId))
      .collect();
  },
});
