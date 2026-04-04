"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import { PremiumScreen } from "../../runtime/premium-primitives";
import type { AACBoardConfig, AACButton } from "./schema";

const FITZGERALD_COLORS: Record<string, string> = {
  verb:       "#22c55e",
  pronoun:    "#eab308",
  noun:       "#f97316",
  descriptor: "#3b82f6",
  social:     "#ec4899",
  core:       "#f1f5f9",
};

function buttonStyle(button: AACButton, highContrast: boolean): React.CSSProperties {
  if (highContrast) return {};
  if (button.wordCategory) return { backgroundColor: FITZGERALD_COLORS[button.wordCategory] };
  if (button.backgroundColor) return { backgroundColor: button.backgroundColor };
  return {};
}

export function AACBoardRuntime({
  config, mode: _mode, onEvent, voice,
}: RuntimeProps<AACBoardConfig>) {
  const [sentence, setSentence] = useState<string[]>([]);

  useEffect(() => { onEvent("app_opened"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleButtonPress = useCallback((button: AACButton) => {
    onEvent("item_tapped", JSON.stringify({ buttonId: button.id, label: button.label }));
    if (config.sentenceStripEnabled) {
      setSentence((prev) => [...prev, button.speakText]);
    } else if (config.autoSpeak) {
      void voice.speak({ text: button.speakText, voice: config.voice });
    }
  }, [config.sentenceStripEnabled, config.autoSpeak, config.voice, onEvent, voice]);

  const handleSpeak = useCallback(() => {
    if (sentence.length === 0) return;
    void voice.speak({ text: sentence.join(" "), voice: config.voice });
    setSentence([]);
  }, [sentence, config.voice, voice]);

  // Motor planning: pad to gridCols × gridRows fixed slots
  // Defensive: buttons may be missing if config is partially hydrated
  const buttons = config.buttons ?? [];
  const totalSlots = config.gridCols * config.gridRows;
  const slots = Array.from({ length: totalSlots }, (_, i) => buttons[i] ?? null);

  return (
    <div className={cn("p-4", config.highContrast && "high-contrast bg-black")}>
      <PremiumScreen title={config.title} className="h-full">
        {/* Sentence strip */}
        {config.sentenceStripEnabled && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 min-h-[44px]">
            <span className="flex-1 text-sm text-foreground">
              {sentence.length > 0 ? sentence.join(" · ") : (
                <span className="text-muted-foreground">Tap buttons to build a sentence…</span>
              )}
            </span>
            {sentence.length > 0 && (
              <>
                <button onClick={handleSpeak}
                  className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
                  Speak
                </button>
                <button onClick={() => setSentence([])} aria-label="Clear strip"
                  className="px-2 py-1 rounded-lg bg-muted text-muted-foreground text-xs">
                  ✕
                </button>
              </>
            )}
          </div>
        )}

        {/* Motor planning grid */}
        <div className="grid gap-3 flex-1"
          style={{ gridTemplateColumns: `repeat(${config.gridCols}, minmax(0, 1fr))` }}>
          {slots.map((button, slotIndex) =>
            button ? (
              <button key={button.id} onClick={() => handleButtonPress(button)}
                style={buttonStyle(button, config.highContrast)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-2xl p-4",
                  "min-h-[100px] touch-manipulation select-none",
                  "transition-all duration-300 active:scale-95",
                  !button.wordCategory && !button.backgroundColor && (
                    config.highContrast
                      ? "bg-yellow-400 text-black border-4 border-white"
                      : "bg-primary/10 hover:bg-primary/20 text-foreground border-2 border-border"
                  ),
                )}
                aria-label={button.speakText}>
                {button.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={button.imageUrl} alt={button.label} className="w-16 h-16 object-cover rounded-xl" />
                )}
                {config.showTextLabels && (
                  <span className="text-sm font-medium text-center leading-tight">{button.label}</span>
                )}
              </button>
            ) : (
              <div key={`empty-${slotIndex}`} data-slot-empty="true"
                className="rounded-2xl min-h-[100px] bg-muted/20 border-2 border-dashed border-border/30"
                aria-hidden="true" />
            )
          )}
        </div>
      </PremiumScreen>
    </div>
  );
}
