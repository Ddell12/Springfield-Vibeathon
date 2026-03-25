import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";

export const get = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentContext")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

export const save = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    messages: v.any(),
    tokenCount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agentContext")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        messages: args.messages,
        tokenCount: args.tokenCount,
      });
    } else {
      await ctx.db.insert("agentContext", {
        sessionId: args.sessionId,
        messages: args.messages,
        tokenCount: args.tokenCount,
      });
    }
  },
});

export const compact = internalMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agentContext")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!existing) return;

    // Placeholder: when tokenCount > 100000, summarize old messages.
    // For now, truncate to last 20 messages and reset tokenCount.
    if (existing.tokenCount > 100000) {
      const messages = Array.isArray(existing.messages) ? existing.messages : [];
      const truncated = messages.slice(-20);
      await ctx.db.patch(existing._id, {
        messages: truncated,
        tokenCount: 0,
      });
    }
  },
});
