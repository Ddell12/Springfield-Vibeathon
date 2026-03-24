import { v } from "convex/values";
import { nanoid } from "nanoid";

import { mutation, query } from "./_generated/server";

const toolTypeValidator = v.union(
  v.literal("visual-schedule"),
  v.literal("token-board"),
  v.literal("communication-board"),
  v.literal("choice-board"),
  v.literal("first-then-board")
);

export const get = query({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.toolId);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tools")
      .withIndex("by_share_slug", (q) => q.eq("shareSlug", args.slug))
      .first();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tools")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    toolType: toolTypeValidator,
    config: v.any(),
    threadId: v.optional(v.string()),
    isTemplate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const shareSlug = nanoid(10);

    return await ctx.db.insert("tools", {
      title: args.title,
      description: args.description,
      toolType: args.toolType,
      config: args.config,
      threadId: args.threadId,
      isTemplate: args.isTemplate ?? false,
      shareSlug,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    toolId: v.id("tools"),
    config: v.any(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { toolId, config, title } = args;
    const patch: Record<string, unknown> = {
      config,
      updatedAt: Date.now(),
    };

    if (title !== undefined) {
      patch.title = title;
    }

    await ctx.db.patch(toolId, patch);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("tools") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

export const getByThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tools")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();
  },
});
