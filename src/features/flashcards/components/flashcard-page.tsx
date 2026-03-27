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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { DeleteConfirmationDialog } from "@/shared/components/delete-confirmation-dialog";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useFlashcardStreaming } from "../hooks/use-flashcard-streaming";
import { FLASHCARD_SUGGESTIONS } from "../lib/constants";
import { DeckList } from "./deck-list";
import { FlashcardChatPanel } from "./flashcard-chat-panel";
import { FlashcardPreviewPanel } from "./flashcard-preview-panel";
import { FlashcardToolbar } from "./flashcard-toolbar";
import { RenameDeckDialog } from "./rename-deck-dialog";

export function FlashcardPage() {
  const isMobile = useIsMobile();
  const { status, sessionId, activityMessage, generate, reset } = useFlashcardStreaming();
  const [activeDeckId, setActiveDeckId] = useState<Id<"flashcardDecks"> | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"chat" | "preview">("chat");
  const [isEditingName, setIsEditingName] = useState(false);
  const [promptInput, setPromptInput] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  // Deck sheet state
  const [deckSheetOpen, setDeckSheetOpen] = useState(false);

  // Deck management dialog state
  const [renameDeckId, setRenameDeckId] = useState<Id<"flashcardDecks"> | null>(null);
  const [renameDeckTitle, setRenameDeckTitle] = useState("");
  const [deleteDeckId, setDeleteDeckId] = useState<Id<"flashcardDecks"> | null>(null);
  const [deleteDeckTitle, setDeleteDeckTitle] = useState("");

  const updateTitle = useMutation(api.sessions.updateTitle);
  const updateDeck = useMutation(api.flashcard_decks.update);
  const removeDeck = useMutation(api.flashcard_decks.remove);

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
      setPendingPrompt(prompt);
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

  // Deck management handlers
  const handleRenameDeck = (deckId: Id<"flashcardDecks">, title: string) => {
    setRenameDeckId(deckId);
    setRenameDeckTitle(title);
  };

  const handleConfirmRename = async (newName: string) => {
    if (!renameDeckId) return;
    try {
      await updateDeck({ deckId: renameDeckId, title: newName });
      toast.success("Deck renamed");
    } catch {
      toast.error("Failed to rename deck");
    }
    setRenameDeckId(null);
  };

  const handleDeleteDeck = (deckId: Id<"flashcardDecks">, title: string) => {
    setDeleteDeckId(deckId);
    setDeleteDeckTitle(title);
  };

  const handleConfirmDelete = async () => {
    if (!deleteDeckId) return;
    try {
      await removeDeck({ deckId: deleteDeckId });
      if (activeDeckId === deleteDeckId) {
        setActiveDeckId(null);
      }
      toast.success("Deck deleted");
    } catch {
      toast.error("Failed to delete deck");
    }
    setDeleteDeckId(null);
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
        /* Phase 2: Toolbar + 2-panel layout */
        <>
          <FlashcardToolbar
            status={status}
            projectName={sessionName}
            isEditingName={isEditingName}
            onNameEditStart={() => setIsEditingName(true)}
            onNameEditEnd={handleNameEditEnd}
            onNewChat={handleNewChat}
            onOpenDeckSheet={() => setDeckSheetOpen(true)}
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
                      pendingPrompt={pendingPrompt}
                      onPendingPromptClear={() => setPendingPrompt(null)}
                    />
                  </div>
                ) : (
                  <div className="h-full overflow-hidden rounded-2xl bg-surface-container-lowest">
                    <FlashcardPreviewPanel
                      activeDeckId={activeDeckId}
                      onOpenDeckSheet={() => setDeckSheetOpen(true)}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Desktop: 2-panel resizable layout (matching builder pattern) */
              <ResizablePanelGroup orientation="horizontal" className="h-full">
                <ResizablePanel defaultSize={30} minSize={20}>
                  <div className="h-full overflow-hidden rounded-2xl bg-surface-container-lowest">
                    <FlashcardChatPanel
                      sessionId={sessionId}
                      status={status}
                      activityMessage={activityMessage}
                      onSubmit={handleSubmit}
                      pendingPrompt={pendingPrompt}
                      onPendingPromptClear={() => setPendingPrompt(null)}
                    />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={70} minSize={30}>
                  <div className="h-full overflow-hidden rounded-2xl bg-surface-container-lowest">
                    <FlashcardPreviewPanel
                      activeDeckId={activeDeckId}
                      onOpenDeckSheet={() => setDeckSheetOpen(true)}
                    />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </div>
        </>
      )}

      {/* Deck management sheet */}
      <Sheet open={deckSheetOpen} onOpenChange={setDeckSheetOpen}>
        <SheetContent side="right" className="w-80 sm:w-96">
          <SheetHeader>
            <SheetTitle className="font-headline">Your Decks</SheetTitle>
          </SheetHeader>
          <div className="mt-4 overflow-y-auto">
            <DeckList
              activeDeckId={activeDeckId}
              onSelectDeck={setActiveDeckId}
              onRenameDeck={handleRenameDeck}
              onDeleteDeck={handleDeleteDeck}
              onClose={() => setDeckSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Rename deck dialog */}
      <RenameDeckDialog
        open={renameDeckId !== null}
        onOpenChange={(open) => { if (!open) setRenameDeckId(null); }}
        currentName={renameDeckTitle}
        onConfirm={handleConfirmRename}
      />

      {/* Delete deck confirmation */}
      <DeleteConfirmationDialog
        open={deleteDeckId !== null}
        onOpenChange={(open) => { if (!open) setDeleteDeckId(null); }}
        projectName={deleteDeckTitle}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
