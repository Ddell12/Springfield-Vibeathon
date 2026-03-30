"use client";

import { useQuery } from "convex/react";

import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DeckCard } from "./deck-card";

interface DeckListProps {
  activeDeckId: Id<"flashcardDecks"> | null;
  onSelectDeck: (deckId: Id<"flashcardDecks">) => void;
  onRenameDeck?: (deckId: Id<"flashcardDecks">, title: string) => void;
  onDeleteDeck?: (deckId: Id<"flashcardDecks">, title: string) => void;
  onClose?: () => void;
}

export function DeckList({
  activeDeckId,
  onSelectDeck,
  onRenameDeck,
  onDeleteDeck,
  onClose,
}: DeckListProps) {
  const decks = useQuery(api.flashcard_decks.list, {});

  if (!decks || decks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center text-on-surface-variant/60">
        <MaterialIcon icon="collections_bookmark" size="lg" className="opacity-30" />
        <div>
          <p className="text-sm font-medium">No decks yet</p>
          <p className="mt-1 text-xs">Use the chat to create flashcard decks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="font-body text-sm font-medium uppercase tracking-widest text-on-surface-variant">
          Your Decks
        </h3>
        <span className="text-xs text-on-surface-variant/60">
          {decks.length} deck{decks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {decks.map((deck) => (
        <DeckCard
          key={deck._id}
          title={deck.title}
          cardCount={deck.cardCount}
          coverImageUrl={deck.coverImageUrl}
          isActive={deck._id === activeDeckId}
          onClick={() => {
            onSelectDeck(deck._id);
            onClose?.();
          }}
          onRename={onRenameDeck ? () => onRenameDeck(deck._id, deck.title) : undefined}
          onDelete={onDeleteDeck ? () => onDeleteDeck(deck._id, deck.title) : undefined}
        />
      ))}

      <p className="mt-4 px-1 text-center text-xs text-on-surface-variant/50">
        Use the chat to create new decks
      </p>
    </div>
  );
}
