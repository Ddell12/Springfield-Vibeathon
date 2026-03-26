"use client";

import { useCallback, useRef, useState } from "react";

import { MaterialIcon } from "@/shared/components/material-icon";

interface FlashcardCardProps {
  label: string;
  imageUrl?: string;
  audioUrl?: string;
  index: number;
  total: number;
}

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%23e8e8e8' width='300' height='300'/%3E%3Ctext x='150' y='160' text-anchor='middle' fill='%23999' font-size='16'%3EGenerating...%3C/text%3E%3C/svg%3E";

export function FlashcardCard({ label, imageUrl, audioUrl, index, total }: FlashcardCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback(() => {
    if (!audioUrl || isPlaying) return;
    setIsPlaying(true);

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    audio.play().catch(() => setIsPlaying(false));
  }, [audioUrl, isPlaying]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-xl shadow-on-surface/5">
        <div className="absolute bottom-0 left-0 top-0 w-1.5 bg-primary" />
        <div className="aspect-square w-full overflow-hidden rounded-2xl shadow-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl ?? PLACEHOLDER_IMAGE}
            alt={label}
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>

        <div className="flex items-center justify-between px-6 py-4">
          <span className="font-manrope text-5xl font-extrabold tracking-tight text-on-surface">
            {label}
          </span>
          {audioUrl && (
            <button
              onClick={playAudio}
              disabled={isPlaying}
              className="shrink-0 rounded-full bg-primary-container/10 p-4 text-primary hover:bg-primary-container/20"
              aria-label={`Listen to "${label}"`}
            >
              <MaterialIcon
                icon="volume_up"
                size="lg"
                className={isPlaying ? "animate-pulse text-primary/70" : ""}
              />
            </button>
          )}
        </div>
      </div>

      <span className="text-sm text-on-surface-variant">
        {index + 1} of {total}
      </span>
    </div>
  );
}
