"use client";

import { useMutation } from "convex/react";
import { useCallback, useEffect } from "react";

import { api } from "@convex/_generated/api";
import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import type { AACBoardConfig } from "./schema";

export function AACBoardRuntime({
  config,
  shareToken,
  onEvent,
}: RuntimeProps<AACBoardConfig>) {
  const logEvent = useMutation(api.tools.logEvent);

  useEffect(() => {
    if (shareToken !== "preview") {
      void logEvent({ shareToken, eventType: "app_opened" });
    }
    onEvent("app_opened");
  }, [shareToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleButtonPress = useCallback(
    (buttonId: string, label: string, speakText: string) => {
      const payloadJson = JSON.stringify({ buttonId, label });
      if (shareToken !== "preview") {
        void logEvent({ shareToken, eventType: "item_tapped", eventPayloadJson: payloadJson });
      }
      onEvent("item_tapped", payloadJson);

      if (config.autoSpeak && typeof window !== "undefined") {
        const utterance = new SpeechSynthesisUtterance(speakText);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    },
    [config.autoSpeak, logEvent, shareToken, onEvent]
  );

  return (
    <div
      className={cn(
        "min-h-screen bg-background p-4 flex flex-col gap-4",
        config.highContrast && "high-contrast bg-black"
      )}
    >
      <h1
        className={cn(
          "text-center font-display text-2xl font-semibold",
          config.highContrast ? "text-white" : "text-foreground"
        )}
      >
        {config.title}
      </h1>

      <div
        className="grid gap-3 flex-1"
        style={{ gridTemplateColumns: `repeat(${config.gridCols}, minmax(0, 1fr))` }}
      >
        {config.buttons.map((button) => (
          <button
            key={button.id}
            onClick={() =>
              handleButtonPress(button.id, button.label, button.speakText)
            }
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl p-4",
              "min-h-[120px] touch-manipulation select-none",
              "transition-all duration-150 active:scale-95",
              config.highContrast
                ? "bg-yellow-400 text-black border-4 border-white"
                : "bg-primary/10 hover:bg-primary/20 text-foreground border-2 border-border"
            )}
            style={
              button.backgroundColor ? { backgroundColor: button.backgroundColor } : {}
            }
            aria-label={button.speakText}
          >
            {button.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={button.imageUrl}
                alt={button.label}
                className="w-16 h-16 object-cover rounded-xl"
              />
            )}
            {config.showTextLabels && (
              <span className="text-sm font-medium text-center leading-tight">
                {button.label}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
