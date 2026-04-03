import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const get = query({
  args: {
    appId: v.id("app_instances"),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appState")
      .withIndex("by_appKey", (q) =>
        q.eq("appId", args.appId).eq("key", args.key)
      )
      .first();
  },
});

export const set = mutation({
  args: {
    appId: v.id("app_instances"),
    key: v.string(),
    value: v.any(), // Intentional: sandbox KV, value shape varies by key
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("Unknown app");

    const existing = await ctx.db
      .query("appState")
      .withIndex("by_appKey", (q) =>
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
  args: { appId: v.id("app_instances") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appState")
      .withIndex("by_appKey", (q) => q.eq("appId", args.appId))
      .take(100);
  },
});
