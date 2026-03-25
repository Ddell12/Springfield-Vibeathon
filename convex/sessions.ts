import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    title: v.string(),
    query: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", {
      userId: args.userId,
      title: args.title,
      query: args.query,
      state: "idle",
    });
  },
});

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_user")
      .order("desc")
      .take(50);
  },
});

export const startGeneration = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      state: "generating",
      stateMessage: "Generating your app...",
    });
  },
});

export const setLive = mutation({
  args: {
    sessionId: v.id("sessions"),
    sandboxId: v.string(),
    previewUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      state: "live",
      stateMessage: "Live",
      sandboxId: args.sandboxId,
      previewUrl: args.previewUrl,
    });
  },
});

export const setFailed = mutation({
  args: {
    sessionId: v.id("sessions"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      state: "failed",
      error: args.error,
    });
  },
});

export const setBlueprint = mutation({
  args: {
    sessionId: v.id("sessions"),
    blueprint: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      blueprint: args.blueprint,
    });
  },
});

export const setSandbox = mutation({
  args: {
    sessionId: v.id("sessions"),
    sandboxId: v.string(),
    previewUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      sandboxId: args.sandboxId,
      previewUrl: args.previewUrl,
    });
  },
});
