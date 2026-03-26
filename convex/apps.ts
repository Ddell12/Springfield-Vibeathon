import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { assertSessionOwner, getAuthUserId } from "./lib/auth";

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("apps", {
      title: args.title,
      description: args.description,
      userId: identity.subject,
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const app = await ctx.db.get(args.appId);
    if (!app) return null;
    if (app.userId && app.userId !== userId) return null;
    return app;
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App not found");
    if (app.userId && app.userId !== identity.subject) throw new Error("Not authorized");

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const all = await ctx.db
      .query("apps")
      .withIndex("by_created")
      .order("desc")
      .take(50);
    return all.filter((app) => app.userId === identity.subject);
  },
});

// Ensure an app record exists for a session (idempotent — safe to call multiple times)
export const ensureForSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertSessionOwner(ctx, args.sessionId);

    const existing = await ctx.db
      .query("apps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (existing) return existing;

    const slug = Array.from({ length: 12 }, () =>
      "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]
    ).join("");

    const now = Date.now();
    const identity = await ctx.auth.getUserIdentity();
    const appId = await ctx.db.insert("apps", {
      title: args.title,
      description: args.description ?? "",
      sessionId: args.sessionId,
      shareSlug: slug,
      userId: identity?.subject,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(appId);
  },
});

// Used by publishApp action and potential publish UI checks
export const getBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await assertSessionOwner(ctx, args.sessionId, { soft: true });
    if (!session) return null;
    return await ctx.db
      .query("apps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});
