import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { assertPatientAccess } from "./lib/auth";

function normalizeTitle(title: string) {
  return title.trim().toLowerCase();
}

export const create = mutation({
  args: {
    templateType: v.string(),
    title: v.string(),
    patientId: v.optional(v.id("patients")),
    configJson: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    return ctx.db.insert("app_instances", {
      templateType: args.templateType,
      title: args.title,
      titleLower: normalizeTitle(args.title),
      ...(args.patientId !== undefined ? { patientId: args.patientId } : {}),
      slpUserId: identity.subject,
      configJson: args.configJson,
      status: "draft",
      version: 1,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("app_instances"),
    configJson: v.optional(v.string()),        // optional: not required when only updating metadata
    title: v.optional(v.string()),
    patientId: v.optional(v.id("patients")),   // new: patient assignment from publish panel
    goalTags: v.optional(v.array(v.string())), // new: IEP goal tags
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const instance = await ctx.db.get(args.id);
    if (!instance) throw new Error("Not found");
    if (instance.slpUserId !== identity.subject) throw new Error("Forbidden");

    await ctx.db.patch(args.id, {
      ...(args.configJson !== undefined ? { configJson: args.configJson } : {}),
      ...(args.title !== undefined ? { title: args.title, titleLower: normalizeTitle(args.title) } : {}),
      ...(args.patientId !== undefined ? { patientId: args.patientId } : {}),
      ...(args.goalTags !== undefined ? { goalTags: args.goalTags } : {}),
    });
  },
});

export const publish = mutation({
  args: { id: v.id("app_instances") },
  handler: async (ctx, args): Promise<{ shareToken: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const instance = await ctx.db.get(args.id);
    if (!instance) throw new Error("Not found");
    if (instance.slpUserId !== identity.subject) throw new Error("Forbidden");

    const shareToken = crypto.randomUUID();
    const now = Date.now();

    await ctx.db.insert("published_app_versions", {
      appInstanceId: args.id,
      version: instance.version,
      configJson: instance.configJson,
      publishedAt: now,
    });

    await ctx.db.patch(args.id, {
      status: "published",
      shareToken,
      publishedAt: now,
      version: instance.version + 1,
    });

    return { shareToken };
  },
});

export const get = query({
  args: { id: v.id("app_instances") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const getByShareToken = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const instance = await ctx.db
      .query("app_instances")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", args.shareToken))
      .first();
    if (!instance) return null;

    const published = await ctx.db
      .query("published_app_versions")
      .withIndex("by_appInstanceId", (q) => q.eq("appInstanceId", instance._id))
      .order("desc")
      .first();
    if (!published) return null;

    return { instance, configJson: published.configJson };
  },
});

export const listBySLP = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return ctx.db
      .query("app_instances")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", identity.subject))
      .collect();
  },
});

export const listRecentBySLP = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const limit = Math.min(args.limit ?? 5, 10);

    // .order("desc") sorts by _creationTime within the slpUserId partition (most recently created first)
    return ctx.db
      .query("app_instances")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", identity.subject))
      .order("desc")
      .take(limit);
  },
});

export const listPageBySLP = query({
  args: {
    page: v.number(),
    pageSize: v.number(),
    search: v.string(),
    sortBy: v.union(v.literal("recent"), v.literal("alphabetical")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { items: [], totalCount: 0, page: 1, pageSize: args.pageSize };
    }

    // Single query — no silent .take() cap. Filter archived in JS.
    const all = await ctx.db
      .query("app_instances")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", identity.subject))
      .collect();

    let items = all.filter((item) => item.status !== "archived");

    const search = args.search.trim().toLowerCase();
    if (search) {
      // titleLower may be undefined for docs written before the backfill migration ran.
      items = items.filter((item) =>
        (item.titleLower ?? item.title.toLowerCase()).includes(search)
      );
    }

    items.sort((a, b) =>
      args.sortBy === "alphabetical"
        ? a.title.localeCompare(b.title)
        : b._creationTime - a._creationTime
    );

    const totalCount = items.length;
    const page = Math.max(1, args.page);
    const pageSize = Math.min(Math.max(args.pageSize, 1), 24);
    const start = (page - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      totalCount,
      page,
      pageSize,
    };
  },
});

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    try {
      await assertPatientAccess(ctx, args.patientId);
    } catch {
      return [];
    }
    return ctx.db
      .query("app_instances")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .take(100);
  },
});

export const listPublishedByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);
    const items = await ctx.db
      .query("app_instances")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .take(100);
    return items.filter((item) => item.status === "published" && item.shareToken);
  },
});

export const getEventSummaryByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    try {
      await assertPatientAccess(ctx, args.patientId);
    } catch {
      return [];
    }
    const instances = await ctx.db
      .query("app_instances")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .take(100);

    const summaries = await Promise.all(
      instances.map(async (instance) => {
        const events = await ctx.db
          .query("tool_events")
          .withIndex("by_appInstanceId", (q) =>
            q.eq("appInstanceId", instance._id)
          )
          .collect();

        const completions = events.filter(
          (e) => e.eventType === "activity_completed"
        ).length;
        const interactions = events.filter(
          (e) =>
            e.eventType === "item_tapped" ||
            e.eventType === "answer_correct" ||
            e.eventType === "token_added"
        ).length;
        const lastEvent = events.at(-1);

        return {
          appInstanceId: instance._id,
          title: instance.title,
          templateType: instance.templateType,
          status: instance.status,
          shareToken: instance.shareToken,
          goalTags: instance.goalTags,
          totalEvents: events.length,
          completions,
          interactions,
          lastActivityAt: lastEvent?._creationTime ?? null,
        };
      })
    );

    return summaries.filter((s) => s.totalEvents > 0 || s.status === "published");
  },
});

export const duplicate = mutation({
  args: {
    id: v.id("app_instances"),
    patientId: v.id("patients"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"app_instances">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const original = await ctx.db.get(args.id);
    if (!original) throw new Error("Not found");
    if (original.slpUserId !== identity.subject) throw new Error("Forbidden");
    const title = args.title ?? `Copy of ${original.title}`;
    return ctx.db.insert("app_instances", {
      templateType: original.templateType,
      title,
      titleLower: normalizeTitle(title),
      patientId: args.patientId,
      slpUserId: identity.subject,
      configJson: original.configJson,
      status: "draft",
      version: 1,
    });
  },
});

export const archive = mutation({
  args: { id: v.id("app_instances") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const instance = await ctx.db.get(args.id);
    if (!instance) throw new Error("Not found");
    if (instance.slpUserId !== identity.subject) throw new Error("Forbidden");
    await ctx.db.patch(args.id, { status: "archived" });
  },
});

export const unpublish = mutation({
  args: { id: v.id("app_instances") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const instance = await ctx.db.get(args.id);
    if (!instance) throw new Error("Not found");
    if (instance.slpUserId !== identity.subject) throw new Error("Forbidden");
    await ctx.db.patch(args.id, { status: "draft", shareToken: undefined });
  },
});

export const logEvent = mutation({
  args: {
    shareToken: v.string(),
    eventType: v.union(
      v.literal("app_opened"),
      v.literal("item_tapped"),
      v.literal("answer_correct"),
      v.literal("answer_incorrect"),
      v.literal("activity_completed"),
      v.literal("token_added"),
      v.literal("audio_played"),
      v.literal("app_closed")
    ),
    eventPayloadJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db
      .query("app_instances")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", args.shareToken))
      .first();
    if (!instance) return; // silently ignore invalid share tokens

    await ctx.db.insert("tool_events", {
      appInstanceId: instance._id,
      ...(instance.patientId !== undefined ? { patientId: instance.patientId } : {}),
      eventType: args.eventType,
      eventPayloadJson: args.eventPayloadJson,
    });

    // Patch lastActivityAt on the instance for the My Tools activity badge
    await ctx.db.patch(instance._id, { lastActivityAt: Date.now() });
  },
});
