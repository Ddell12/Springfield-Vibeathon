"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { cn } from "@/core/utils";
import { useInteractiveSync } from "../hooks/use-interactive-sync";
import type { ContentControl, ContentUpdate } from "../types";
import { ContentPicker } from "./content-picker";
import { ContentRenderer } from "./content-renderer";

type InteractivePanelProps = {
  isSLP: boolean;
  appointmentId: string;
};

/** Returns a human-readable relative time string like "2s ago". */
function relativeTime(timestamp: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  return `${mins}m ago`;
}

export function InteractivePanel({ isSLP, appointmentId: _appointmentId }: InteractivePanelProps) {
  const { currentContent, lastInteraction, sendContent } = useInteractiveSync();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  // Tick every second so relative timestamps stay fresh
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!lastInteraction) return;
    timerRef.current = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lastInteraction]);

  const handleSelectContent = useCallback((content: ContentUpdate) => {
    sendContent(content);
    setPickerOpen(false);
  }, [sendContent]);

  function handleStopSharing() {
    sendContent({ type: "content-clear" });
  }

  function handleSLPInteraction(control: ContentControl) {
    if (control.type === "content-next" || control.type === "content-previous") {
      // Update the currentIndex in the current content payload
      if (currentContent?.contentType === "flashcard") {
        const currentIndex = Number(currentContent.payload.currentIndex ?? 0);
        const cardCount = Array.isArray(currentContent.payload.cards)
          ? (currentContent.payload.cards as unknown[]).length
          : 0;

        const nextIndex =
          control.type === "content-next"
            ? Math.min(currentIndex + 1, Math.max(0, cardCount - 1))
            : Math.max(0, currentIndex - 1);

        sendContent({
          type: "content-update",
          contentType: "flashcard",
          payload: {
            ...currentContent.payload,
            currentIndex: nextIndex,
          },
        });
      }
    } else if (control.type === "content-reveal") {
      // Re-broadcast the current content with updated revealed flag
      if (currentContent) {
        sendContent({
          type: "content-update",
          contentType: currentContent.contentType,
          payload: { ...currentContent.payload, revealed: control.revealed ?? false },
        });
      }
    } else {
      sendContent(control);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl bg-[#F6F3EE] p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-sm font-semibold text-stone-700">
          {isSLP ? "Interactive Board" : "Shared Content"}
        </h2>

        {/* SLP-only action buttons */}
        {isSLP && (
          <div className="flex items-center gap-2">
            {currentContent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStopSharing}
                className={cn(
                  "h-7 gap-1 px-2 font-body text-xs text-stone-500",
                  "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  "hover:bg-red-50 hover:text-red-600",
                )}
              >
                <MaterialIcon icon="stop_screen_share" className="text-sm" />
                Stop
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
              className={cn(
                "h-7 gap-1 px-2 font-body text-xs",
                "bg-gradient-to-r from-[#00595c] to-[#0d7377] text-white",
                "border-0 hover:opacity-90",
                "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              )}
            >
              <MaterialIcon icon="present_to_all" className="text-sm" />
              Share
            </Button>
          </div>
        )}
      </div>

      {/* Content renderer — fills remaining space */}
      <div className="flex-1">
        <ContentRenderer
          content={currentContent}
          isSLP={isSLP}
          onSLPInteraction={handleSLPInteraction}
        />
      </div>

      {/* Last interaction indicator — SLP only, shown when there's interaction data */}
      {isSLP && lastInteraction && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2",
            "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          )}
        >
          <MaterialIcon icon="touch_app" className="text-sm text-[#00595c]" />
          <p className="font-body text-xs text-stone-600">
            Patient{" "}
            <span className="font-medium text-stone-800">
              {lastInteraction.action}
            </span>
            {lastInteraction.target ? (
              <>
                {" "}
                <span className="italic">&ldquo;{lastInteraction.target}&rdquo;</span>
              </>
            ) : null}
            {" "}
            <span className="text-stone-400">
              {relativeTime(lastInteraction.timestamp)}
            </span>
          </p>
        </div>
      )}

      {/* Content picker sheet — SLP only */}
      {isSLP && (
        <ContentPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelectContent={handleSelectContent}
        />
      )}
    </div>
  );
}
