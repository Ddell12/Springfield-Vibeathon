import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./lib/auth";

/** Verify the caller owns the given deck (or deck has no userId — legacy). */
async function assertDeckOwner(
  ctx: QueryCtx | MutationCtx,
  deckId: Id<"flashcardDecks">,
  opts?: { soft?: boolean },
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    if (opts?.soft) return null;
    throw new Error("Not authenticated");
  }
  const deck = await ctx.db.get(deckId);
  if (!deck) {
    if (opts?.soft) return null;
    throw new Error("Deck not found");
  }
  if (deck.userId && deck.userId !== userId) {
    if (opts?.soft) return null;
    throw new Error("Not authorized");
  }
  return deck;
}

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
    await assertDeckOwner(ctx, args.deckId);

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
    const deck = await assertDeckOwner(ctx, args.deckId, { soft: true });
    if (!deck) return [];

    return await ctx.db
      .query("flashcards")
      .withIndex("by_deck_sortOrder", (q) => q.eq("deckId", args.deckId))
      .take(200);
  },
});

export const deleteByDeck = mutation({
  args: {
    deckId: v.id("flashcardDecks"),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await assertDeckOwner(ctx, args.deckId);

    const cards = await ctx.db
      .query("flashcards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .take(500);

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
