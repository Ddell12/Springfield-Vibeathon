"use client";

import { useQuery } from "convex/react";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FlashcardSwiper } from "./flashcard-swiper";

interface FlashcardPreviewPanelProps {
  activeDeckId: Id<"flashcardDecks"> | null;
  onOpenDeckSheet?: () => void;
}

export function FlashcardPreviewPanel({
  activeDeckId,
  onOpenDeckSheet,
}: FlashcardPreviewPanelProps) {
  const deck = useQuery(
    api.flashcard_decks.get,
    activeDeckId ? { deckId: activeDeckId } : "skip",
  );

  const cards = useQuery(
    api.flashcard_cards.listByDeck,
    activeDeckId ? { deckId: activeDeckId } : "skip",
  );

  if (!activeDeckId) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-on-surface-variant">
        <MaterialIcon icon="collections_bookmark" size="lg" className="opacity-30" />
        <p className="mt-3 text-sm">Select a deck or create new flashcards</p>
        {onOpenDeckSheet && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenDeckSheet}
            className="mt-2 gap-1.5 text-primary"
          >
            <MaterialIcon icon="collections_bookmark" size="xs" />
            Browse decks
          </Button>
        )}
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-on-surface-variant">
        <MaterialIcon icon="progress_activity" size="lg" className="animate-spin" />
        <p className="mt-3 text-sm">Creating your flashcards...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Deck context header */}
      {deck && (
        <div className="flex shrink-0 items-center justify-between border-b border-border/30 px-4 py-2">
          <div className="flex items-center gap-2">
            <MaterialIcon icon="collections_bookmark" size="xs" className="text-primary" />
            <span className="truncate text-sm font-medium text-on-surface">
              {deck.title}
            </span>
            <span className="text-xs text-on-surface-variant">
              ({cards.length} card{cards.length !== 1 ? "s" : ""})
            </span>
          </div>
          {onOpenDeckSheet && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenDeckSheet}
              className="h-8 gap-1 px-2 text-xs text-on-surface-variant hover:text-primary"
            >
              <MaterialIcon icon="swap_horiz" size="xs" />
              Switch
            </Button>
          )}
        </div>
      )}

      {/* Flashcard swiper */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-4">
        <FlashcardSwiper cards={cards} />
      </div>
    </div>
  );
}
