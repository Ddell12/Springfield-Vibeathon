"use client";

import { useQuery } from "convex/react";

import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FlashcardSwiper } from "./flashcard-swiper";

interface FlashcardPreviewPanelProps {
  activeDeckId: Id<"flashcardDecks"> | null;
}

export function FlashcardPreviewPanel({
  activeDeckId,
}: FlashcardPreviewPanelProps) {
  const cards = useQuery(
    api.flashcard_cards.listByDeck,
    activeDeckId ? { deckId: activeDeckId } : "skip",
  );

  if (!activeDeckId) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-on-surface-variant">
        <MaterialIcon icon="collections_bookmark" size="lg" className="opacity-30" />
        <p className="mt-3 text-sm">Select a deck or create new flashcards</p>
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
    <div className="flex h-full items-center justify-center px-4">
      <FlashcardSwiper cards={cards} />
    </div>
  );
}
