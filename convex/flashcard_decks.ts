import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { assertSessionOwner, getAuthUserId } from "./lib/auth";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    await assertSessionOwner(ctx, args.sessionId);
    const identity = await ctx.auth.getUserIdentity();
    return await ctx.db.insert("flashcardDecks", {
      title: args.title,
      description: args.description,
      sessionId: args.sessionId,
      userId: identity?.subject,
      cardCount: 0,
    });
  },
});

export const get = query({
  args: { deckId: v.id("flashcardDecks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const deck = await ctx.db.get(args.deckId);
    if (!deck) return null;
    if (deck.userId && deck.userId !== userId) return null;
    return deck;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("flashcardDecks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const listBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await assertSessionOwner(ctx, args.sessionId, { soft: true });
    if (!session) return [];
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const deck = await ctx.db.get(args.deckId);
    if (!deck) throw new Error("Deck not found");
    if (deck.userId && deck.userId !== identity.subject) throw new Error("Not authorized");

    const { deckId, ...fields } = args;
    const updates: Record<string, unknown> = {};
    if (fields.title !== undefined) updates.title = fields.title;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.coverImageUrl !== undefined) updates.coverImageUrl = fields.coverImageUrl;
    if (fields.cardCount !== undefined) updates.cardCount = fields.cardCount;
    await ctx.db.patch(deckId, updates);
  },
});
