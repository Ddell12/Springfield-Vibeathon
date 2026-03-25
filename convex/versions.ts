import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

export const create = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    version: v.number(),
    trigger: v.union(
      v.literal("phase_complete"),
      v.literal("user_edit"),
      v.literal("auto_fix"),
      v.literal("follow_up")
    ),
    triggerMessage: v.optional(v.string()),
    fileRefs: v.array(v.id("files")),
    diff: v.array(v.object({
      path: v.string(),
      action: v.union(v.literal("added"), v.literal("modified"), v.literal("deleted")),
    })),
    phaseIndex: v.optional(v.number()),
    fileCount: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("versions", {
      sessionId: args.sessionId,
      version: args.version,
      trigger: args.trigger,
      triggerMessage: args.triggerMessage,
      fileRefs: args.fileRefs,
      diff: args.diff,
      phaseIndex: args.phaseIndex,
      fileCount: args.fileCount,
      timestamp: args.timestamp,
    });
  },
});

export const list = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("versions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const getLatest = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("versions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
  },
});

export const restore = mutation({
  args: {
    sessionId: v.id("sessions"),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    // Placeholder for version restore functionality.
    // For now, just return the version doc.
    return await ctx.db
      .query("versions")
      .withIndex("by_session_version", (q) =>
        q.eq("sessionId", args.sessionId).eq("version", args.version)
      )
      .first();
  },
});
