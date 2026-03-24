import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let shareSlug = "";
    for (let i = 0; i < 10; i++) {
      shareSlug += chars[Math.floor(Math.random() * chars.length)];
    }
    const now = Date.now();

    const projectId = await ctx.db.insert("projects", {
      title: args.title,
      description: args.description,
      shareSlug,
      createdAt: now,
      updatedAt: now,
    });

    return projectId;
  },
});

export const get = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_shareSlug", (q) => q.eq("shareSlug", args.slug))
      .first();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    fragment: v.optional(v.any()),
    sandboxId: v.optional(v.string()),
    messages: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { projectId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (fields.title !== undefined) updates.title = fields.title;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.fragment !== undefined) updates.fragment = fields.fragment;
    if (fields.sandboxId !== undefined) updates.sandboxId = fields.sandboxId;
    if (fields.messages !== undefined) updates.messages = fields.messages;

    await ctx.db.patch(projectId, updates);
  },
});

export const remove = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.projectId);
  },
});
