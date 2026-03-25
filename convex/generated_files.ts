import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

const fileStatusValidator = v.union(
  v.literal("generated"),
  v.literal("modified"),
  v.literal("deleted")
);

export const upsert = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    phaseId: v.id("phases"),
    path: v.string(),
    contents: v.string(),
    purpose: v.string(),
    status: fileStatusValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", args.sessionId).eq("path", args.path)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        phaseId: args.phaseId,
        contents: args.contents,
        purpose: args.purpose,
        status: args.status,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("files", {
        sessionId: args.sessionId,
        phaseId: args.phaseId,
        path: args.path,
        contents: args.contents,
        purpose: args.purpose,
        status: args.status,
      });
    }
  },
});

export const list = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const getByPath = query({
  args: {
    sessionId: v.id("sessions"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", args.sessionId).eq("path", args.path)
      )
      .first();
  },
});

export const listByPhase = query({
  args: { phaseId: v.id("phases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_phase", (q) => q.eq("phaseId", args.phaseId))
      .collect();
  },
});
