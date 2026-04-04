import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

/** Returns all key-value pairs for an app instance. */
export const getAll = query({
  args: { appInstanceId: v.id("app_instances") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("app_instance_data")
      .withIndex("by_appInstanceId", (q) =>
        q.eq("appInstanceId", args.appInstanceId)
      )
      .collect();
  },
});

/** Sets or updates a key's value for an app instance. */
export const upsert = mutation({
  args: {
    appInstanceId: v.id("app_instances"),
    key: v.string(),
    valueJson: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("app_instance_data")
      .withIndex("by_appInstanceId_key", (q) =>
        q.eq("appInstanceId", args.appInstanceId).eq("key", args.key)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        valueJson: args.valueJson,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("app_instance_data", {
        appInstanceId: args.appInstanceId,
        key: args.key,
        valueJson: args.valueJson,
        updatedAt: Date.now(),
      });
    }
  },
});

/** Removes a key from an app instance's data store. */
export const remove = mutation({
  args: {
    appInstanceId: v.id("app_instances"),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("app_instance_data")
      .withIndex("by_appInstanceId_key", (q) =>
        q.eq("appInstanceId", args.appInstanceId).eq("key", args.key)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/** Returns recent tool events for an app instance (most recent 500). */
export const getEvents = query({
  args: { appInstanceId: v.id("app_instances") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("tool_events")
      .withIndex("by_appInstanceId", (q) =>
        q.eq("appInstanceId", args.appInstanceId)
      )
      .order("desc")
      .take(500);
  },
});
