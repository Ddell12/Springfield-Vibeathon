import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    templateType: v.string(),
    title: v.string(),
    patientId: v.id("patients"),
    configJson: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    return ctx.db.insert("app_instances", {
      templateType: args.templateType,
      title: args.title,
      patientId: args.patientId,
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
    configJson: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const instance = await ctx.db.get(args.id);
    if (!instance) throw new Error("Not found");
    if (instance.slpUserId !== identity.subject) throw new Error("Forbidden");

    await ctx.db.patch(args.id, {
      configJson: args.configJson,
      ...(args.title !== undefined ? { title: args.title } : {}),
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

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) =>
    ctx.db
      .query("app_instances")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect(),
});

export const getEventSummaryByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const instances = await ctx.db
      .query("app_instances")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

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
      patientId: instance.patientId,
      eventType: args.eventType,
      eventPayloadJson: args.eventPayloadJson,
    });
  },
});
