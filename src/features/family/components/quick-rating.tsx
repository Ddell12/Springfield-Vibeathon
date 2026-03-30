"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/core/utils";

interface QuickRatingProps {
  onRate: (stars: number) => void;
  onSkip: () => void;
}

export function QuickRating({ onRate, onSkip }: QuickRatingProps) {
  const [hoveredStar, setHoveredStar] = useState(0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-zinc-900">
        <p className="mb-4 text-lg font-bold text-foreground">
          How did it go?
        </p>

        <div className="mb-6 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onRate(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="p-1 transition-transform active:scale-90"
              aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "h-10 w-10 transition-colors",
                  star <= hoveredStar
                    ? "fill-caution text-caution"
                    : "fill-muted text-muted"
                )}
              />
            </button>
          ))}
        </div>

        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
