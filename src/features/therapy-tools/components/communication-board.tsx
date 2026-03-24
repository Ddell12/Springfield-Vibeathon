"use client";

import { useAction } from "convex/react";
import { anyApi } from "convex/server";
import { motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

import type { CommunicationBoardConfig } from "../types/tool-configs";

export function CommunicationBoard({
  config,
}: {
  config: CommunicationBoardConfig;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const generateSpeech = useAction(anyApi.aiActions.generateSpeech);

  function handleToggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSpeak() {
    if (selectedIds.length === 0 || !config.enableTTS) return;

    const selected = config.cards.filter((c) => selectedIds.includes(c.id));
    const sentence = `${config.sentenceStarter} ${selected.map((c) => c.label).join(", ")}`;

    setIsSpeaking(true);
    try {
      await generateSpeech({
        text: sentence,
        voiceId: config.voiceId ?? "default",
      });
    } catch (err) {
      console.error("[TTS] Failed to generate speech:", err);
    } finally {
      setIsSpeaking(false);
    }
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
          const cardWithImage = card as typeof card & { imageUrl?: string };
          return (
            <motion.button
              key={card.id}
              onClick={() => handleToggle(card.id)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "group flex flex-col items-center justify-center p-6 bg-surface-container-low rounded-xl cursor-pointer transition-all duration-300",
                "hover:bg-surface-container-high hover:scale-105",
                isSelected && "ring-2 ring-primary bg-primary/5",
              )}
            >
              {cardWithImage.imageUrl ? (
                <div className="mb-4 w-12 h-12 md:w-16 md:h-16 relative overflow-hidden rounded-lg">
                  <Image
                    src={cardWithImage.imageUrl}
                    alt={card.label}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <span className="text-4xl md:text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {card.icon}
                </span>
              )}
              <span className="font-headline text-sm font-semibold text-primary">
                {card.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Speak Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSpeak}
          disabled={selectedIds.length === 0 || isSpeaking}
          className="bg-primary-gradient text-white px-8 py-4 rounded-2xl text-lg font-bold w-full max-w-xs flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
        >
          <MaterialIcon
            icon={isSpeaking ? "hourglass_empty" : "volume_up"}
            className="text-2xl"
          />
          {isSpeaking ? "Speaking..." : "SPEAK"}
        </button>
      </div>
    </div>
  );
}
