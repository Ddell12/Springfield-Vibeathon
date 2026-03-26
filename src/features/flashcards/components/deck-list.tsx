"use client";

import { useQuery } from "convex/react";

import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DeckCard } from "./deck-card";

interface DeckListProps {
  activeDeckId: Id<"flashcardDecks"> | null;
  onSelectDeck: (deckId: Id<"flashcardDecks">) => void;
}

export function DeckList({ activeDeckId, onSelectDeck }: DeckListProps) {
  const decks = useQuery(api.flashcard_decks.list, {});

  if (!decks || decks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-on-surface-variant/60">
        <MaterialIcon icon="collections_bookmark" size="lg" />
        <p className="text-sm">No decks yet</p>
        <p className="text-xs">Create flashcards using the chat</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <h3 className="px-3 pb-2 font-manrope text-xs font-semibold uppercase tracking-wider text-on-surface-variant/60">
        Your Decks
      </h3>
      {decks.map((deck) => (
        <DeckCard
          key={deck._id}
          title={deck.title}
          cardCount={deck.cardCount}
          coverImageUrl={deck.coverImageUrl}
          isActive={deck._id === activeDeckId}
          onClick={() => onSelectDeck(deck._id)}
        />
      ))}
    </div>
  );
}
