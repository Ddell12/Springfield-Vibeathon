// convex/sessions.ts
import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const create = mutation({
  args: {
    title: v.string(),
    query: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("sessions", {
      userId: args.userId,
      title: args.title,
      query: args.query,
      state: "idle",
      currentPhaseIndex: 0,
      phasesRemaining: 8,
      mvpGenerated: false,
    });
    return sessionId;
  },
});

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

// Used by pipeline actions via ctx.runQuery
export const getInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

const AUTO_ADVANCE_STATES = [
  "template_selecting", "phase_generating", "phase_implementing",
  "deploying", "validating", "finalizing", "reviewing",
];

export const updateState = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    state: v.string(),
    stateMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      state: args.state as any,
      stateMessage: args.stateMessage,
    });

    if (AUTO_ADVANCE_STATES.includes(args.state)) {
      await ctx.scheduler.runAfter(0, internal.pipeline.executeStep, {
        sessionId: args.sessionId,
      });
    }
  },
});

// Public mutation — callable from ConvexHTTPClient in API routes
export const startBuild = mutation({
  args: { title: v.string(), query: v.string(), userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("sessions", {
      userId: args.userId,
      title: args.title,
      query: args.query,
      state: "idle",
      currentPhaseIndex: 0,
      phasesRemaining: 8,
      mvpGenerated: false,
    });
    // Transition to blueprinting + schedule pipeline
    await ctx.db.patch(sessionId, {
      state: "blueprinting",
      stateMessage: "Generating app blueprint...",
    });
    await ctx.scheduler.runAfter(0, internal.pipeline.executeStep, { sessionId });
    return sessionId;
  },
});

// Public mutation — adds follow-up message after completion, recharges counter
export const addFollowUp = mutation({
  args: { sessionId: v.id("sessions"), message: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.state !== "complete") return;
    // Add user message
    await ctx.db.insert("messages", {
      sessionId: args.sessionId,
      role: "user",
      content: args.message,
      timestamp: Date.now(),
    });
    // Recharge phase counter to 3 and restart pipeline
    await ctx.db.patch(args.sessionId, {
      state: "phase_generating",
      stateMessage: "Processing follow-up...",
      phasesRemaining: 3,
    });
    await ctx.scheduler.runAfter(0, internal.pipeline.executeStep, { sessionId: args.sessionId });
  },
});

export const setFailed = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;
    await ctx.db.patch(args.sessionId, {
      state: "failed",
      failureReason: args.reason,
      lastGoodState: session.state,
    });
  },
});
