import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { ConvexHttpClient } from "convex/browser";
import { z } from "zod";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface FlashcardToolContext {
  send: (event: string, data: object) => void;
  sessionId: Id<"sessions">;
  convex: ConvexHttpClient;
}

export function createFlashcardTools(ctx: FlashcardToolContext) {
  const createDeck = betaZodTool({
    name: "create_deck",
    description:
      "Create a new flashcard deck. Call this FIRST before creating cards. Returns the deck ID needed for create_cards.",
    inputSchema: z.object({
      title: z.string().max(100).describe("Deck name, e.g., 'Farm Animals', 'Colors'"),
      description: z.string().max(500).optional().describe("Short description of the deck"),
    }),
    run: async ({ title, description }) => {
      const deckId = await ctx.convex.mutation(api.flashcard_decks.create, {
        title,
        description,
        sessionId: ctx.sessionId,
      });
      ctx.send("activity", { type: "deck_created", message: `Created deck: ${title}` });
      return `Deck created with ID: ${deckId}. Now call create_cards with this deck ID.`;
    },
  });

  const createCards = betaZodTool({
    name: "create_cards",
    description:
      "Create multiple flashcards in a deck at once. Each card gets an AI-generated therapy image and text-to-speech audio. Pass all cards in a single call for efficiency.",
    inputSchema: z.object({
      deckId: z.string().describe("The deck ID returned by create_deck"),
      cards: z.array(z.object({
        label: z.string().describe("The word or phrase for this card, e.g., 'red ball', 'happy'"),
        category: z.string().optional().describe("Category: colors, animals, emotions, daily-activities, food, objects, people, places"),
      })).min(1).max(20).describe("Array of cards to create"),
    }),
    run: async ({ deckId, cards }) => {
      ctx.send("activity", {
        type: "thinking",
        message: `Generating ${cards.length} flashcards with images and audio...`,
      });

      const results = await Promise.allSettled(
        cards.map(async (card, index) => {
          let imageUrl: string | undefined;
          try {
            const imageResult = await ctx.convex.action(
              api.image_generation.generateTherapyImage,
              { label: card.label, category: card.category ?? "objects" },
            );
            imageUrl = imageResult.imageUrl;
          } catch (err) {
            console.error(`[flashcards] Image gen failed for "${card.label}":`, err);
          }

          let audioUrl: string | undefined;
          try {
            const speechResult = await ctx.convex.action(api.aiActions.generateSpeech, {
              text: card.label,
              voice: "child-friendly",
            });
            audioUrl = speechResult.audioUrl;
          } catch (err) {
            console.error(`[flashcards] TTS failed for "${card.label}":`, err);
          }

          await ctx.convex.mutation(api.flashcard_cards.create, {
            deckId: deckId as Id<"flashcardDecks">,
            label: card.label,
            imageUrl,
            audioUrl,
            sortOrder: index,
            category: card.category,
          });

          ctx.send("activity", {
            type: "card_created",
            message: `Created card: ${card.label}`,
          });

          return { label: card.label, imageUrl: !!imageUrl, audioUrl: !!audioUrl };
        }),
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return `Created ${succeeded} cards${failed > 0 ? ` (${failed} failed)` : ""}. Cards are now visible in the deck viewer.`;
    },
  });

  const updateDeck = betaZodTool({
    name: "update_deck",
    description: "Update a deck's title or description.",
    inputSchema: z.object({
      deckId: z.string().describe("The deck ID to update"),
      title: z.string().max(100).optional(),
      description: z.string().max(500).optional(),
    }),
    run: async ({ deckId, title, description }) => {
      await ctx.convex.mutation(api.flashcard_decks.update, {
        deckId: deckId as Id<"flashcardDecks">,
        title,
        description,
      });
      return `Deck updated successfully.`;
    },
  });

  const deleteCards = betaZodTool({
    name: "delete_cards",
    description: "Remove cards from a deck. If no labels specified, removes all cards.",
    inputSchema: z.object({
      deckId: z.string().describe("The deck ID"),
      labels: z.array(z.string()).optional().describe("Specific card labels to delete. Omit to delete all."),
    }),
    run: async ({ deckId, labels }) => {
      const result = await ctx.convex.mutation(api.flashcard_cards.deleteByDeck, {
        deckId: deckId as Id<"flashcardDecks">,
        labels,
      });
      return `Deleted ${result.deleted} card(s).`;
    },
  });

  return [createDeck, createCards, updateDeck, deleteCards];
}
