import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const upsert = mutation({
  args: {
    sessionId: v.id("sessions"),
    path: v.string(),
    contents: v.string(),
    version: v.number(),
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
        contents: args.contents,
        version: args.version,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("files", {
        sessionId: args.sessionId,
        path: args.path,
        contents: args.contents,
        version: args.version,
      });
    }
  },
});

export const upsertAutoVersion = mutation({
  args: {
    sessionId: v.id("sessions"),
    path: v.string(),
    contents: v.string(),
  },
  handler: async (ctx, args): Promise<{ id: Id<"files">; version: number }> => {
    const existing = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", args.sessionId).eq("path", args.path)
      )
      .first();

    // Find max version across all files in this session (atomic within transaction)
    const allFiles = await ctx.db
      .query("files")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(100);
    const maxVersion = allFiles.reduce((max, f) => Math.max(max, f.version ?? 0), 0);
    const nextVersion = maxVersion + 1;

    if (existing) {
      await ctx.db.patch(existing._id, { contents: args.contents, version: nextVersion });
      return { id: existing._id, version: nextVersion };
    } else {
      const id = await ctx.db.insert("files", { ...args, version: nextVersion });
      return { id, version: nextVersion };
    }
  },
});

export const list = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(100);
  },
});

export const getByPath = query({
  args: {
    sessionId: v.id("sessions"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", args.sessionId).eq("path", args.path)
      )
      .first();
    return result ?? null;
  },
});
