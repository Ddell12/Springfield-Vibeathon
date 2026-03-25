import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const create = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    blueprint: v.any(),
    markdownPreview: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("blueprints", {
      sessionId: args.sessionId,
      blueprint: args.blueprint,
      markdownPreview: args.markdownPreview,
      approved: false,
      version: 1,
    });
  },
});

export const getBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("blueprints")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

export const approve = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const bp = await ctx.db
      .query("blueprints")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!bp) throw new Error(`No blueprint found for session ${args.sessionId}`);

    await ctx.db.patch(bp._id, { approved: true });

    // Update session state directly (cleaner in a single transaction)
    await ctx.db.patch(args.sessionId, {
      state: "template_selecting",
      stateMessage: "Selecting template...",
    });

    // Schedule next pipeline step
    await ctx.scheduler.runAfter(0, internal.pipeline.executeStep, {
      sessionId: args.sessionId,
    });
  },
});

export const requestChanges = mutation({
  args: {
    sessionId: v.id("sessions"),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    // Add feedback as user message
    await ctx.db.insert("messages", {
      sessionId: args.sessionId,
      role: "user",
      content: args.feedback,
      timestamp: Date.now(),
    });

    // Schedule pipeline re-run for blueprint regeneration
    await ctx.db.patch(args.sessionId, {
      state: "blueprinting",
      stateMessage: "Regenerating blueprint with your feedback...",
    });
    await ctx.scheduler.runAfter(0, internal.pipeline.executeStep, {
      sessionId: args.sessionId,
    });
  },
});
