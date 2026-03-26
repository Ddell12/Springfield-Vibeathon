// TODO (Phase 6): Add ctx.auth.getUserIdentity() checks to create, update; filter list/getBySession by userId
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    sessionId: v.optional(v.id("sessions")),
    shareSlug: v.string(),
    previewUrl: v.optional(v.string()),
    publishedUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("apps", {
      title: args.title,
      description: args.description,
      sessionId: args.sessionId,
      shareSlug: args.shareSlug,
      previewUrl: args.previewUrl,
      publishedUrl: args.publishedUrl,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const get = query({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.appId);
  },
});

export const getByShareSlug = query({
  args: { shareSlug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apps")
      .withIndex("by_share_slug", (q) => q.eq("shareSlug", args.shareSlug))
      .first();
  },
});

export const update = mutation({
  args: {
    appId: v.id("apps"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    publishedUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { appId, ...fields } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (fields.title !== undefined) patch.title = fields.title;
    if (fields.description !== undefined) patch.description = fields.description;
    if (fields.publishedUrl !== undefined) patch.publishedUrl = fields.publishedUrl;
    await ctx.db.patch(appId, patch);
    return appId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("apps")
      .withIndex("by_created")
      .order("desc")
      .take(50);
  },
});

// Used by publishApp action and potential publish UI checks
export const getBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});
