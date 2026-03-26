"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useIsMobile } from "@/core/hooks/use-mobile";
import { MaterialIcon } from "@/shared/components/material-icon";
import { SuggestionChips } from "@/shared/components/suggestion-chips";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useFlashcardStreaming } from "../hooks/use-flashcard-streaming";
import { FLASHCARD_SUGGESTIONS } from "../lib/constants";
import { DeckList } from "./deck-list";
import { FlashcardChatPanel } from "./flashcard-chat-panel";
import { FlashcardPreviewPanel } from "./flashcard-preview-panel";
import { FlashcardToolbar } from "./flashcard-toolbar";

export function FlashcardPage() {
  const isMobile = useIsMobile();
  const { status, sessionId, activityMessage, generate, reset } = useFlashcardStreaming();
  const [activeDeckId, setActiveDeckId] = useState<Id<"flashcardDecks"> | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"chat" | "preview">("chat");
  const [isEditingName, setIsEditingName] = useState(false);
  const [promptInput, setPromptInput] = useState("");
  const updateTitle = useMutation(api.sessions.updateTitle);

  const currentSession = useQuery(
    api.sessions.get,
    sessionId ? { sessionId } : "skip",
  );

  const sessionDecks = useQuery(
    api.flashcard_decks.listBySession,
    sessionId ? { sessionId } : "skip",
  );

  const sessionName = currentSession?.title ?? "Untitled Deck";

  /* eslint-disable react-hooks/set-state-in-effect -- auto-select first deck on load */
  useEffect(() => {
    if (sessionDecks && sessionDecks.length > 0 && !activeDeckId) {
      setActiveDeckId(sessionDecks[0]._id);
    }
  }, [sessionDecks, activeDeckId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = useCallback(
    (query: string) => {
      generate(query, sessionId ?? undefined);
    },
    [generate, sessionId],
  );

  const handleGenerate = useCallback(
    (prompt: string) => {
      generate(prompt);
    },
    [generate],
  );

  const handleNameEditEnd = async (name: string) => {
    setIsEditingName(false);
    const trimmed = name.trim();
    if (!trimmed || trimmed === sessionName || !sessionId) return;
    try {
      await updateTitle({ sessionId, title: trimmed });
    } catch {
      toast.error("Failed to rename");
    }
  };

  const handleNewChat = () => {
    reset();
    setActiveDeckId(null);
    window.location.href = "/flashcards?new=1";
  };

  const showPromptScreen = !sessionId && status === "idle";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {showPromptScreen ? (
        /* Phase 1: Full-width centered prompt — no session yet */
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
          <div className="text-center">
            <h1 className="font-headline text-3xl font-semibold text-foreground">
              What flashcards would you like to create?
            </h1>
            <p className="mt-2 text-base text-on-surface-variant">
              Describe them and AI will generate images and audio for each card.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!promptInput.trim()) return;
              handleGenerate(promptInput.trim());
              setPromptInput("");
            }}
            className="w-full max-w-2xl"
          >
            <div className="flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/30">
              <Input
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Describe the flashcards you want to create…"
                className="flex-1 border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
                aria-label="Describe the flashcards you want to create"
              />
              <Button
                type="submit"
                disabled={!promptInput.trim()}
                size="icon"
                className="shrink-0 rounded-full"
                aria-label="Generate flashcards"
              >
                <MaterialIcon icon="auto_fix_high" size="xs" />
              </Button>
            </div>
          </form>
          <SuggestionChips
            suggestions={FLASHCARD_SUGGESTIONS}
            onSelect={(suggestion) => {
              handleGenerate(suggestion);
            }}
          />
        </div>
      ) : (
        /* Phase 2: Toolbar + split-panel layout */
        <>
          <FlashcardToolbar
            status={status}
            projectName={sessionName}
            isEditingName={isEditingName}
            onNameEditStart={() => setIsEditingName(true)}
            onNameEditEnd={handleNameEditEnd}
            onNewChat={handleNewChat}
            isMobile={isMobile}
            mobilePanel={mobilePanel}
            onMobilePanelChange={setMobilePanel}
          />

          <div className="min-h-0 flex-1 bg-surface-container-low p-2">
            {isMobile ? (
              /* Mobile: single panel toggled via toolbar */
              <div className="h-full">
                {mobilePanel === "chat" ? (
                  <div className="h-full overflow-hidden rounded-2xl bg-surface-container-lowest">
                    <FlashcardChatPanel
                      sessionId={sessionId}
                      status={status}
                      activityMessage={activityMessage}
                      onSubmit={handleSubmit}
                    />
                  </div>
                ) : (
                  <div className="h-full overflow-hidden rounded-2xl bg-surface-container-lowest">
                    <FlashcardPreviewPanel activeDeckId={activeDeckId} />
                  </div>
                )}
              </div>
            ) : (
              /* Desktop: 3-panel resizable layout */
              <ResizablePanelGroup orientation="horizontal" className="h-full">
                <ResizablePanel defaultSize={25} minSize={20}>
                  <div className="h-full overflow-hidden rounded-2xl bg-surface-container-lowest">
                    <FlashcardChatPanel
                      sessionId={sessionId}
                      status={status}
                      activityMessage={activityMessage}
                      onSubmit={handleSubmit}
                    />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={50} minSize={30}>
                  <div className="h-full overflow-hidden rounded-2xl bg-surface-container-lowest">
                    <FlashcardPreviewPanel activeDeckId={activeDeckId} />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={25} minSize={15} maxSize={30}>
                  <div className="h-full overflow-hidden rounded-2xl bg-surface-container-lowest p-4">
                    <DeckList activeDeckId={activeDeckId} onSelectDeck={setActiveDeckId} />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </div>
        </>
      )}
    </div>
  );
}
