"use client";

import { useState } from "react";
import { MaterialIcon } from "@/shared/components/material-icon";
import { cn } from "@/core/utils";
import type { CommunicationBoardConfig } from "../types/tool-configs";

export function CommunicationBoard({ config }: { config: CommunicationBoardConfig }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function handleToggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleSpeak() {
    const selected = config.cards.filter((c) => selectedIds.includes(c.id));
    const sentence = `${config.sentenceStarter} ${selected.map((c) => c.label).join(", ")}`;
    // TTS placeholder — log for now
    console.log("[TTS]", sentence);
  }

  const selectedLabels = config.cards
    .filter((c) => selectedIds.includes(c.id))
    .map((c) => c.label);

  return (
    <div className="space-y-6 relative z-10">
      {/* Sentence Starter Strip */}
      <div className="bg-primary/10 rounded-xl p-3 text-center font-headline text-lg text-primary">
        {config.sentenceStarter}{" "}
        {selectedLabels.length > 0 && (
          <span className="font-bold">{selectedLabels.join(", ")}</span>
        )}
      </div>

      {/* Card Grid */}
      <div
        className={cn(
          "grid gap-4 md:gap-6",
          `grid-cols-2 sm:grid-cols-3 md:grid-cols-${config.columns}`,
        )}
      >
        {config.cards.map((card) => {
          const isSelected = selectedIds.includes(card.id);
          return (
            <button
              key={card.id}
              onClick={() => handleToggle(card.id)}
              className={cn(
                "group flex flex-col items-center justify-center p-6 bg-surface-container-low rounded-xl cursor-pointer transition-all duration-300",
                "hover:bg-surface-container-high hover:scale-105",
                isSelected && "ring-2 ring-primary bg-primary/5",
              )}
            >
              <span className="text-4xl md:text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {card.icon}
              </span>
              <span className="font-headline text-sm font-semibold text-primary">
                {card.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Speak Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSpeak}
          disabled={selectedIds.length === 0}
          className="bg-primary-gradient text-white px-8 py-4 rounded-2xl text-lg font-bold w-full max-w-xs flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
        >
          <MaterialIcon icon="volume_up" className="text-2xl" />
          SPEAK
        </button>
      </div>
    </div>
  );
}
