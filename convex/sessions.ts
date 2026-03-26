// Auth: identity checks deferred — single-user demo mode
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { SESSION_STATES } from "./lib/session_states";

export const create = mutation({
  args: {
    title: v.string(),
    query: v.string(),
    // ⚠️ Pre-auth placeholder — do NOT use for authorization.
    // Phase 6 will derive userId from ctx.auth.getUserIdentity()
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", {
      userId: args.userId,
      title: args.title,
      query: args.query,
      state: SESSION_STATES.IDLE,
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
      state: SESSION_STATES.GENERATING,
      stateMessage: "Generating your app...",
    });
  },
});

export const setLive = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      state: SESSION_STATES.LIVE,
      stateMessage: "Live",
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
      state: SESSION_STATES.FAILED,
      error: args.error,
    });
  },
});


const VALID_STATES = Object.values(SESSION_STATES);

export const listByState = query({
  args: { state: v.union(v.literal("idle"), v.literal("generating"), v.literal("live"), v.literal("failed")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .order("desc")
      .take(50);
  },
});

export const remove = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    // Cascade-delete messages in batches (loop prevents orphans for large sessions)
    while (true) {
      const batch = await ctx.db
        .query("messages")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .take(500);
      if (batch.length === 0) break;
      for (const msg of batch) {
        await ctx.db.delete(msg._id);
      }
    }

    // Cascade-delete files in batches
    while (true) {
      const batch = await ctx.db
        .query("files")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .take(200);
      if (batch.length === 0) break;
      for (const file of batch) {
        await ctx.db.delete(file._id);
      }
    }

    // Cascade-delete apps (typically 0-1 per session)
    const apps = await ctx.db
      .query("apps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(10);
    for (const app of apps) {
      await ctx.db.delete(app._id);
    }

    // Delete the session itself
    await ctx.db.delete(args.sessionId);
  },
});

export const updateTitle = mutation({
  args: {
    sessionId: v.id("sessions"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.title.slice(0, 100);
    await ctx.db.patch(args.sessionId, {
      title: trimmed,
    });
  },
});

export const getMostRecent = query({
  args: {},
  handler: async (ctx) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_state", (q) => q.eq("state", SESSION_STATES.LIVE))
      .order("desc")
      .first();
    return session;
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
