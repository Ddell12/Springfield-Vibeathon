"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { MaterialIcon } from "@/shared/components/material-icon";
import { cn } from "@/core/utils";
import type { ContentUpdate } from "../types";

type ContentPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContent: (content: ContentUpdate) => void;
};

export function ContentPicker({
  open,
  onOpenChange,
  onSelectContent,
}: ContentPickerProps) {
  const decks = useQuery(api.flashcard_decks.list);
  const apps = useQuery(api.apps.listMine);

  // pendingDeckId holds the deck the SLP tapped while we wait for cards to load
  const [pendingDeckId, setPendingDeckId] = useState<Id<"flashcardDecks"> | null>(null);
  const pendingCards = useQuery(
    api.flashcard_cards.listByDeck,
    pendingDeckId !== null ? { deckId: pendingDeckId } : "skip",
  );

  // Fire the content payload once cards resolve for the pending deck
  useEffect(() => {
    if (pendingDeckId === null || pendingCards === undefined) return;
    const deck = decks?.find((d) => d._id === pendingDeckId);
    if (!deck) return;

    onSelectContent({
      type: "content-update",
      contentType: "flashcard",
      payload: {
        deckId: deck._id,
        deckTitle: deck.title,
        // Map cards: label → front; no back field exists in schema
        cards: pendingCards.map((c) => ({
          front: c.label,
          back: "",
          imageUrl: c.imageUrl,
        })),
        currentIndex: 0,
        revealed: false,
      },
    });
    setPendingDeckId(null);
    onOpenChange(false);
  }, [pendingDeckId, pendingCards, decks, onSelectContent, onOpenChange]);

  // Called when the SLP taps a deck row — triggers the card fetch
  function handleSelectDeck(deck: NonNullable<typeof decks>[number]) {
    setPendingDeckId(deck._id);
  }

  function handleSelectApp(app: NonNullable<typeof apps>[number]) {
    onSelectContent({
      type: "content-update",
      contentType: "app",
      payload: {
        appId: app._id,
        title: app.title,
        bundleUrl: app.previewUrl ?? "",
      },
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-sm bg-[#F6F3EE]">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-headline text-[#00595c]">
            Share Content
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="flashcards" className="flex flex-col gap-4">
          <TabsList className="w-full">
            <TabsTrigger value="flashcards" className="flex-1 font-body text-sm">
              Flashcards
            </TabsTrigger>
            <TabsTrigger value="apps" className="flex-1 font-body text-sm">
              Apps
            </TabsTrigger>
            <TabsTrigger value="images" className="flex-1 font-body text-sm">
              Images
            </TabsTrigger>
          </TabsList>

          {/* Flashcards tab */}
          <TabsContent value="flashcards" className="mt-0">
            {decks === undefined ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-stone-200"
                  />
                ))}
              </div>
            ) : decks.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <MaterialIcon icon="style" className="text-3xl text-stone-300" />
                <p className="font-body text-sm text-stone-500">
                  No flashcard decks yet. Build some in the Flashcards section.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {decks.map((deck) => (
                  <button
                    key={deck._id}
                    type="button"
                    onClick={() => handleSelectDeck(deck)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-left",
                      "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                      "hover:bg-teal-50 hover:shadow-sm",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00595c]",
                    )}
                  >
                    <MaterialIcon icon="style" className="text-xl text-[#00595c]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm font-medium text-stone-800">
                        {deck.title}
                      </p>
                      <p className="font-body text-xs text-stone-500">
                        {deck.cardCount} card{deck.cardCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <MaterialIcon icon="chevron_right" className="text-lg text-stone-400" />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Apps tab */}
          <TabsContent value="apps" className="mt-0">
            {apps === undefined ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-stone-200"
                  />
                ))}
              </div>
            ) : apps.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <MaterialIcon icon="apps" className="text-3xl text-stone-300" />
                <p className="font-body text-sm text-stone-500">
                  No therapy apps yet. Build one in the Builder.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {apps.map((app) => (
                  <button
                    key={app._id}
                    type="button"
                    onClick={() => handleSelectApp(app)}
                    disabled={!app.previewUrl}
                    className={cn(
                      "flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-left",
                      "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                      "hover:bg-teal-50 hover:shadow-sm",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00595c]",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  >
                    <MaterialIcon icon="grid_view" className="text-xl text-[#00595c]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm font-medium text-stone-800">
                        {app.title}
                      </p>
                      {!app.previewUrl && (
                        <p className="font-body text-xs text-stone-400">Not yet built</p>
                      )}
                    </div>
                    <MaterialIcon icon="chevron_right" className="text-lg text-stone-400" />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Images tab — coming soon */}
          <TabsContent value="images" className="mt-0">
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <MaterialIcon icon="image" className="text-3xl text-stone-300" />
              <p className="font-headline text-base text-stone-600">Coming soon</p>
              <p className="font-body text-sm text-stone-400">
                Image sharing will be available in a future update.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
