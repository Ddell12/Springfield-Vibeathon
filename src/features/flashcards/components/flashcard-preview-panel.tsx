"use client";

import { useQuery } from "convex/react";

import { MaterialIcon } from "@/shared/components/material-icon";

import { SuggestionChips } from "@/shared/components/suggestion-chips";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DeckList } from "./deck-list";
import { FlashcardSwiper } from "./flashcard-swiper";

const FLASHCARD_SUGGESTIONS = [
  "Make flashcards for basic colors like red, blue, green, yellow",
  "Create a farm animals flashcard deck with common animals",
  "Make emotion flashcards for a 3-year-old: happy, sad, angry, scared",
  "Create flashcards for common foods: apple, banana, milk, bread, cookie",
  "Make flashcards for body parts: eyes, nose, mouth, hands, feet",
];

interface FlashcardPreviewPanelProps {
  activeDeckId: Id<"flashcardDecks"> | null;
  onSelectDeck: (deckId: Id<"flashcardDecks">) => void;
  onSuggestionSelect: (prompt: string) => void;
  hasSession: boolean;
}

export function FlashcardPreviewPanel({
  activeDeckId,
  onSelectDeck,
  onSuggestionSelect,
  hasSession,
}: FlashcardPreviewPanelProps) {
  const cards = useQuery(
    api.flashcard_cards.listByDeck,
    activeDeckId ? { deckId: activeDeckId } : "skip",
  );

  if (!hasSession && !activeDeckId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <MaterialIcon icon="collections_bookmark" size="lg" className="text-primary" />
          </div>
          <h2 className="font-manrope text-2xl font-semibold text-on-surface">
            Flashcard Creator
          </h2>
          <p className="max-w-md text-on-surface-variant">
            Describe the flashcards you want to create and AI will generate images and audio for each card.
          </p>
        </div>
        <SuggestionChips suggestions={FLASHCARD_SUGGESTIONS} onSelect={onSuggestionSelect} />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-1 items-center justify-center px-4">
        {cards && cards.length > 0 ? (
          <FlashcardSwiper cards={cards} />
        ) : (
          <div className="text-center text-on-surface-variant">
            <MaterialIcon icon="progress_activity" size="lg" className="animate-spin" />
            <p className="mt-2 text-sm">Creating your flashcards...</p>
          </div>
        )}
      </div>

      <div className="hidden w-64 border-l border-border/40 bg-surface p-4 lg:block">
        <DeckList activeDeckId={activeDeckId} onSelectDeck={onSelectDeck} />
      </div>
    </div>
  );
}
