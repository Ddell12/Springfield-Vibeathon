"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { cn } from "@/core/utils";
import type { ContentControl, ContentUpdate, Interaction } from "../types";

type ContentRendererProps = {
  content: ContentUpdate | null;
  isSLP: boolean;
  onSLPInteraction?: (control: ContentControl) => void;
  onPatientInteraction?: (interaction: Interaction) => void;
};

export function ContentRenderer({
  content,
  isSLP,
  onSLPInteraction,
  onPatientInteraction,
}: ContentRendererProps) {
  const [cardRevealed, setCardRevealed] = useState(
    () => Boolean(content?.payload?.revealed),
  );

  // Sync revealed state when a new content-update arrives from the data channel
  useEffect(() => {
    setCardRevealed(Boolean(content?.payload?.revealed));
  }, [content?.payload?.revealed]);

  // Reset reveal state when content changes
  function getCardFront(): string {
    if (!content || content.contentType !== "flashcard") return "";
    const cards = content.payload.cards as Array<{ front: string; back: string; imageUrl?: string }> | undefined;
    if (cards && cards.length > 0) {
      const index = Number(content.payload.currentIndex ?? 0);
      return cards[index]?.front ?? "";
    }
    // Fallback for legacy payloads that may not have the cards array
    return String(content.payload.cardFront ?? content.payload.deckTitle ?? "");
  }

  function getCardBack(): string {
    if (!content || content.contentType !== "flashcard") return "";
    const cards = content.payload.cards as Array<{ front: string; back: string; imageUrl?: string }> | undefined;
    if (cards && cards.length > 0) {
      const index = Number(content.payload.currentIndex ?? 0);
      return cards[index]?.back ?? "";
    }
    // Fallback for legacy payloads
    return String(content.payload.cardBack ?? "");
  }

  function getCurrentIndex(): number {
    if (!content || content.contentType !== "flashcard") return 0;
    return Number(content.payload.currentIndex ?? 0);
  }

  function getCardCount(): number {
    if (!content || content.contentType !== "flashcard") return 0;
    const cards = content.payload.cards as unknown[] | undefined;
    return cards?.length ?? Number(content.payload.cardCount ?? 0);
  }

  // Empty state
  if (!content) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl bg-white p-6 text-center">
        <MaterialIcon icon="present_to_all" className="text-4xl text-stone-300" />
        <p className="font-headline text-base text-stone-500">No content shared yet</p>
        <p className="font-body text-sm text-stone-400">
          {isSLP
            ? 'Click "Share Content" to show flashcards or an app.'
            : "Your therapist will share content here during the session."}
        </p>
      </div>
    );
  }

  // Flashcard renderer
  if (content.contentType === "flashcard") {
    const front = getCardFront();
    const back = getCardBack();
    const index = getCurrentIndex();
    const total = getCardCount();
    const hasNavigation = total > 1;

    return (
      <div className="flex h-full flex-col gap-3">
        {/* Card counter */}
        {hasNavigation && (
          <p className="text-center font-body text-xs text-stone-500">
            Card {index + 1} of {total}
          </p>
        )}

        {/* Card face — tappable for patient to log interaction */}
        <div
          role={!isSLP && onPatientInteraction ? "button" : "region"}
          aria-label={!isSLP && onPatientInteraction ? `Tap to select "${front}"` : "Flashcard"}
          tabIndex={!isSLP && onPatientInteraction ? 0 : undefined}
          onClick={
            !isSLP && onPatientInteraction
              ? () =>
                  onPatientInteraction({
                    type: "interaction",
                    action: "tapped",
                    target: front,
                    timestamp: Date.now(),
                  })
              : undefined
          }
          onKeyDown={
            !isSLP && onPatientInteraction
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onPatientInteraction({
                      type: "interaction",
                      action: "tapped",
                      target: front,
                      timestamp: Date.now(),
                    });
                  }
                }
              : undefined
          }
          className={cn(
            "flex flex-1 flex-col items-center justify-center rounded-xl bg-white p-8 text-center shadow-sm",
            "min-h-[180px]",
            !isSLP && onPatientInteraction && [
              "cursor-pointer select-none",
              "transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
              "active:scale-[0.97] hover:shadow-md",
            ],
          )}
        >
          <p className="font-headline text-2xl text-stone-800">{front || "—"}</p>

          {/* Back side — shown only after reveal */}
          {cardRevealed && back && (
            <div className="mt-4 border-t border-stone-100 pt-4 w-full">
              <p className="font-body text-base text-stone-600">{back}</p>
            </div>
          )}

          {/* Tap hint for patient */}
          {!isSLP && onPatientInteraction && (
            <p className="mt-3 font-body text-xs text-stone-400">Tap to respond</p>
          )}
        </div>

        {/* SLP controls — Next/Previous and Reveal are SLP-only per spec.
            Reveal is SLP-only because toggling it sends an updated content-update
            message via the data channel to sync the revealed state to the patient's
            side; the patient's renderer just reflects what the incoming payload says. */}
        {isSLP && (
          <div className="flex items-center gap-2">
            {hasNavigation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCardRevealed(false);
                  onSLPInteraction?.({ type: "content-previous" });
                }}
                disabled={index === 0}
                className="flex-1 font-body"
              >
                <MaterialIcon icon="chevron_left" className="mr-1 text-base" />
                Previous
              </Button>
            )}

            {back && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newRevealed = !cardRevealed;
                  setCardRevealed(newRevealed);
                  onSLPInteraction?.({ type: "content-reveal", revealed: newRevealed });
                }}
                className="flex-1 font-body"
              >
                <MaterialIcon
                  icon={cardRevealed ? "visibility_off" : "visibility"}
                  className="mr-1 text-base"
                />
                {cardRevealed ? "Hide" : "Reveal"}
              </Button>
            )}

            {hasNavigation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCardRevealed(false);
                  onSLPInteraction?.({ type: "content-next" });
                }}
                disabled={total > 0 && index >= total - 1}
                className="flex-1 font-body"
              >
                Next
                <MaterialIcon icon="chevron_right" className="ml-1 text-base" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // App renderer
  if (content.contentType === "app") {
    const bundleUrl = String(content.payload.bundleUrl ?? "");

    if (!bundleUrl) {
      return (
        <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl bg-white p-6 text-center">
          <MaterialIcon icon="error_outline" className="text-3xl text-stone-300" />
          <p className="font-body text-sm text-stone-500">App preview not available.</p>
        </div>
      );
    }

    return (
      <div className="h-full min-h-[300px] overflow-hidden rounded-xl bg-white shadow-sm">
        <iframe
          src={bundleUrl}
          sandbox="allow-scripts allow-same-origin"
          className="h-full w-full border-0"
          title={String(content.payload.title ?? "Therapy App")}
        />
      </div>
    );
  }

  // Image renderer
  if (content.contentType === "image") {
    const url = String(content.payload.url ?? "");
    const alt = String(content.payload.alt ?? "Shared image");

    if (!url) {
      return (
        <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl bg-white">
          <p className="font-body text-sm text-stone-400">Image not available.</p>
        </div>
      );
    }

    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-white p-4 shadow-sm">
        <div className="relative h-full w-full">
          <Image
            src={url}
            alt={alt}
            fill
            className="rounded-lg object-contain"
            unoptimized
          />
        </div>
      </div>
    );
  }

  return null;
}
