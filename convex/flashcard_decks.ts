import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    sessionId: v.id("sessions"),
    // ⚠️ Pre-auth placeholder — do NOT use for authorization.
    // Phase 6 will derive userId from ctx.auth.getUserIdentity()
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("flashcardDecks", {
      title: args.title,
      description: args.description,
      sessionId: args.sessionId,
      userId: args.userId,
      cardCount: 0,
    });
  },
});

export const get = query({
  args: { deckId: v.id("flashcardDecks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.deckId);
  },
});

export const list = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.userId) {
      return await ctx.db
        .query("flashcardDecks")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .order("desc")
        .take(50);
    }
    return await ctx.db.query("flashcardDecks").order("desc").take(50);
  },
});

export const listBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("flashcardDecks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(100);
  },
});

export const update = mutation({
  args: {
    deckId: v.id("flashcardDecks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    cardCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { deckId, ...fields } = args;
    const updates: Record<string, unknown> = {};
    if (fields.title !== undefined) updates.title = fields.title;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.coverImageUrl !== undefined) updates.coverImageUrl = fields.coverImageUrl;
    if (fields.cardCount !== undefined) updates.cardCount = fields.cardCount;
    await ctx.db.patch(deckId, updates);
  },
});
