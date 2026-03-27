import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { assertSessionOwner } from "./lib/auth";

export const upsert = mutation({
  args: {
    sessionId: v.id("sessions"),
    path: v.string(),
    contents: v.string(),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    await assertSessionOwner(ctx, args.sessionId);
    if (args.path.length > 500 || args.path.includes("..")) {
      throw new Error("Invalid file path");
    }

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
    await assertSessionOwner(ctx, args.sessionId);
    if (args.path.length > 500 || args.path.includes("..")) {
      throw new Error("Invalid file path");
    }

    const existing = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", args.sessionId).eq("path", args.path)
      )
      .first();

    const nextVersion = (existing?.version ?? 0) + 1;

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
    const session = await assertSessionOwner(ctx, args.sessionId, { soft: true });
    if (!session) return [];
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
    const session = await assertSessionOwner(ctx, args.sessionId, { soft: true });
    if (!session) return null;
    const result = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", args.sessionId).eq("path", args.path)
      )
      .first();
    return result ?? null;
  },
});

/** Public query — serves bundle HTML for shared apps. No auth required. */
export const getPublicBundle = query({
  args: { shareSlug: v.string() },
  handler: async (ctx, args) => {
    const app = await ctx.db
      .query("apps")
      .withIndex("by_share_slug", (q) => q.eq("shareSlug", args.shareSlug))
      .first();
    const sessionId = app?.sessionId;
    if (!sessionId) return null;
    const file = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", sessionId).eq("path", "_bundle.html")
      )
      .first();
    return file?.contents ?? null;
  },
});
