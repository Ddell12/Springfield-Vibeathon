// TODO (Phase 6): Add ctx.auth.getUserIdentity() checks to create, list, get, startGeneration, setLive, setFailed
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { SESSION_STATES } from "./lib/session_states";

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


export const updateTitle = mutation({
  args: {
    sessionId: v.id("sessions"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      title: args.title,
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
