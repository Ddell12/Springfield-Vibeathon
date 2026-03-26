import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    deckId: v.id("flashcardDecks"),
    label: v.string(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    audioUrl: v.optional(v.string()),
    sortOrder: v.number(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cardId = await ctx.db.insert("flashcards", {
      deckId: args.deckId,
      label: args.label,
      imageUrl: args.imageUrl,
      imageStorageId: args.imageStorageId,
      audioUrl: args.audioUrl,
      sortOrder: args.sortOrder,
      category: args.category,
    });

    const deck = await ctx.db.get(args.deckId);
    if (deck) {
      await ctx.db.patch(args.deckId, {
        cardCount: deck.cardCount + 1,
        ...(deck.cardCount === 0 && args.imageUrl
          ? { coverImageUrl: args.imageUrl }
          : {}),
      });
    }

    return cardId;
  },
});

export const listByDeck = query({
  args: { deckId: v.id("flashcardDecks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("flashcards")
      .withIndex("by_deck_sortOrder", (q) => q.eq("deckId", args.deckId))
      .collect();
  },
});

export const deleteByDeck = mutation({
  args: {
    deckId: v.id("flashcardDecks"),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("flashcards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect();

    const toDelete = args.labels
      ? cards.filter((c) => args.labels!.includes(c.label))
      : cards;

    for (const card of toDelete) {
      await ctx.db.delete(card._id);
    }

    const deck = await ctx.db.get(args.deckId);
    if (deck) {
      await ctx.db.patch(args.deckId, {
        cardCount: Math.max(0, deck.cardCount - toDelete.length),
      });
    }

    return { deleted: toDelete.length };
  },
});
