import { v } from "convex/values";

import { FREE_PLAN_LIMIT_REACHED_MESSAGE } from "../shared/app-limits";
import { mutation, query } from "./_generated/server";
import { assertSessionOwner, getAuthUserId } from "./lib/auth";
import { checkPremiumStatus, FREE_LIMITS } from "./lib/billing";
import { authedQuery } from "./lib/customFunctions";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    sessionId: v.optional(v.id("sessions")),
    shareSlug: v.string(),
    previewUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Free-tier limit enforcement — premium users bypass
    const isPremium = await checkPremiumStatus(ctx, userId);
    if (!isPremium) {
      const userApps = await ctx.db
        .query("apps")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(FREE_LIMITS.maxApps);
      if (userApps.length >= FREE_LIMITS.maxApps) {
        throw new Error(FREE_PLAN_LIMIT_REACHED_MESSAGE);
      }
    }

    const now = Date.now();
    return await ctx.db.insert("apps", {
      title: args.title,
      description: args.description,
      userId,
      sessionId: args.sessionId,
      shareSlug: args.shareSlug,
      previewUrl: args.previewUrl,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const get = authedQuery({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    if (!ctx.userId) return null;
    const app = await ctx.db.get(args.appId);
    if (!app) return null;
    if (app.userId && app.userId !== ctx.userId) return null;
    return app;
  },
});

/** Intentionally public — shared apps are accessible by anyone with the slug. */
export const getByShareSlug = query({
  args: { shareSlug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apps")
      .withIndex("by_shareSlug", (q) => q.eq("shareSlug", args.shareSlug))
      .first();
  },
});

export const update = mutation({
  args: {
    appId: v.id("apps"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App not found");
    if (!app.userId || app.userId !== identity.subject) throw new Error("Not authorized");

    const { appId, ...fields } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (fields.title !== undefined) patch.title = fields.title;
    if (fields.description !== undefined) patch.description = fields.description;
    await ctx.db.patch(appId, patch);
    return appId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("apps")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(50);
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
    const userId = await getAuthUserId(ctx);

    const existing = await ctx.db
      .query("apps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (existing) return existing;

    // Free-tier limit enforcement applies only when creating a new saved app record.
    if (userId) {
      const isPremium = await checkPremiumStatus(ctx, userId);
      if (!isPremium) {
        const userApps = await ctx.db
          .query("apps")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(FREE_LIMITS.maxApps);
        if (userApps.length >= FREE_LIMITS.maxApps) {
          throw new Error(FREE_PLAN_LIMIT_REACHED_MESSAGE);
        }
      }
    }

    const slug = Array.from({ length: 12 }, () =>
      "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]
    ).join("");

    const now = Date.now();
    const appId = await ctx.db.insert("apps", {
      title: args.title,
      description: args.description ?? "",
      sessionId: args.sessionId,
      shareSlug: slug,
      userId: userId ?? undefined,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(appId);
  },
});

/** Public query — returns featured apps for the /explore page. No auth required. */
export const listFeatured = query({
  args: {},
  handler: async (ctx) => {
    const apps = await ctx.db
      .query("apps")
      .withIndex("by_featured_order", (q) => q.eq("featured", true))
      .take(100);
    return apps.map((app) => ({
      title: app.title,
      description: app.description,
      shareSlug: app.shareSlug,
      featuredCategory: app.featuredCategory,
      featuredOrder: app.featuredOrder,
    }));
  },
});

export const listMine = authedQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.userId) return [];
    return await ctx.db
      .query("apps")
      .withIndex("by_user", (q) => q.eq("userId", ctx.userId!))
      .take(200);
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
