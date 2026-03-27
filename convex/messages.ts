import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { assertSessionOwner } from "./lib/auth";

export const create = mutation({
  args: {
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await assertSessionOwner(ctx, args.sessionId);
    if (args.content.length > 50_000) {
      throw new Error("Message content exceeds maximum length of 50,000 characters");
    }
    return await ctx.db.insert("messages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      timestamp: args.timestamp,
    });
  },
});

export const list = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await assertSessionOwner(ctx, args.sessionId, { soft: true });
    if (!session) return [];
    return await ctx.db
      .query("messages")
      .withIndex("by_session_timestamp", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .take(500); // Chat history cap — paginate if sessions exceed this
  },
});

export const addUserMessage = mutation({
  args: {
    sessionId: v.id("sessions"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await assertSessionOwner(ctx, args.sessionId);
    if (args.content.length > 10_000) {
      throw new Error("Message content exceeds maximum length of 10,000 characters");
    }
    return await ctx.db.insert("messages", {
      sessionId: args.sessionId,
      role: "user",
      content: args.content,
      timestamp: Date.now(),
    });
  },
});
