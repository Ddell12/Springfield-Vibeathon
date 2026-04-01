"use client";

import { useCallback, useEffect } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import type { AACBoardConfig } from "./schema";

export function AACBoardRuntime({
  config,
  mode,
  onEvent,
  voice,
}: RuntimeProps<AACBoardConfig>) {
  useEffect(() => {
    onEvent("app_opened");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleButtonPress = useCallback(
    (buttonId: string, label: string, speakText: string) => {
      const payloadJson = JSON.stringify({ buttonId, label });
      onEvent("item_tapped", payloadJson);

      if (config.autoSpeak) {
        void voice.speak({ text: speakText, voice: config.voice });
      }
    },
    [config.autoSpeak, config.voice, onEvent, voice]
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
