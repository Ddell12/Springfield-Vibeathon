"use client";

import { useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useFlashcardStreaming, type FlashcardStreamingStatus } from "../hooks/use-flashcard-streaming";
import { FlashcardChatPanel } from "./flashcard-chat-panel";
import { FlashcardPreviewPanel } from "./flashcard-preview-panel";

export function FlashcardPage() {
  const { status, sessionId, activityMessage, generate } = useFlashcardStreaming();
  const [activeDeckId, setActiveDeckId] = useState<Id<"flashcardDecks"> | null>(null);

  const sessionDecks = useQuery(
    api.flashcard_decks.listBySession,
    sessionId ? { sessionId } : "skip",
  );

  useEffect(() => {
    if (sessionDecks && sessionDecks.length > 0 && !activeDeckId) {
      setActiveDeckId(sessionDecks[0]._id);
    }
  }, [sessionDecks, activeDeckId]);

  const handleSubmit = useCallback(
    (query: string) => {
      generate(query, sessionId ?? undefined);
    },
    [generate, sessionId],
  );

  const handleSuggestionSelect = useCallback(
    (prompt: string) => {
      generate(prompt);
    },
    [generate],
  );

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-border/40 bg-surface-container-lowest px-4 py-2.5">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard" aria-label="Back to dashboard">
            <MaterialIcon icon="arrow_back" size="xs" />
          </Link>
        </Button>
        <h1 className="font-manrope text-lg font-semibold text-on-surface">
          Flashcard Creator
        </h1>
      </div>

      {/* Desktop: split panels */}
      <div className="hidden flex-1 md:flex">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <FlashcardChatPanel
              sessionId={sessionId}
              status={status}
              activityMessage={activityMessage}
              onSubmit={handleSubmit}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70}>
            <FlashcardPreviewPanel
              activeDeckId={activeDeckId}
              onSelectDeck={setActiveDeckId}
              onSuggestionSelect={handleSuggestionSelect}
              hasSession={!!sessionId}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: stacked layout */}
      <MobileFlashcardLayout
        sessionId={sessionId}
        status={status}
        activityMessage={activityMessage}
        activeDeckId={activeDeckId}
        onSelectDeck={setActiveDeckId}
        onSubmit={handleSubmit}
        onSuggestionSelect={handleSuggestionSelect}
      />
    </div>
  );
}

function MobileFlashcardLayout({
  sessionId,
  status,
  activityMessage,
  activeDeckId,
  onSelectDeck,
  onSubmit,
  onSuggestionSelect,
}: {
  sessionId: Id<"sessions"> | null;
  status: FlashcardStreamingStatus;
  activityMessage: string;
  activeDeckId: Id<"flashcardDecks"> | null;
  onSelectDeck: (id: Id<"flashcardDecks">) => void;
  onSubmit: (query: string) => void;
  onSuggestionSelect: (prompt: string) => void;
}) {
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (status === "generating") setShowChat(true);
  }, [status]);

  return (
    <div className="relative flex flex-1 flex-col md:hidden">
      <div className="flex-1">
        <FlashcardPreviewPanel
          activeDeckId={activeDeckId}
          onSelectDeck={onSelectDeck}
          onSuggestionSelect={onSuggestionSelect}
          hasSession={!!sessionId}
        />
      </div>

      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="absolute bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg"
          aria-label="Open chat"
        >
          <MaterialIcon icon="chat" size="sm" />
        </button>
      )}

      {showChat && (
        <div className="absolute inset-x-0 bottom-0 top-1/3 rounded-t-2xl bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-2">
            <span className="text-sm font-medium">Chat</span>
            <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
              <MaterialIcon icon="close" size="xs" />
            </Button>
          </div>
          <div className="h-[calc(100%-48px)]">
            <FlashcardChatPanel
              sessionId={sessionId}
              status={status}
              activityMessage={activityMessage}
              onSubmit={onSubmit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
