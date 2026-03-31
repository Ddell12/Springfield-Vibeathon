"use client";

import { cn } from "@/core/utils";

interface TrialButtonsProps {
  onCorrect: () => void;
  onError: () => void;
  disabled?: boolean;
}

export function TrialButtons({ onCorrect, onError, disabled }: TrialButtonsProps) {
  return (
    <div className="flex gap-4 px-4">
      <button
        type="button"
        onClick={onError}
        disabled={disabled}
        className={cn(
          "flex-1 h-20 rounded-2xl text-4xl font-bold",
          "bg-destructive/10 text-destructive border-2 border-destructive/20",
          "active:scale-95 transition-transform duration-300",
          "touch-manipulation select-none",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
        aria-label="Record error"
      >
        −
      </button>
      <button
        type="button"
        onClick={onCorrect}
        disabled={disabled}
        className={cn(
          "flex-1 h-20 rounded-2xl text-4xl font-bold",
          "bg-primary/10 text-primary border-2 border-primary/20",
          "active:scale-95 transition-transform duration-300",
          "touch-manipulation select-none",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
        aria-label="Record correct response"
      >
        +
      </button>
    </div>
  );
}
