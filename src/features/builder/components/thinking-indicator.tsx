"use client";

import { useEffect, useState } from "react";

import { cn } from "@/core/utils";

interface ThinkingIndicatorProps {
  isThinking: boolean;
  startTime?: number;
}

export function ThinkingIndicator({ isThinking, startTime }: ThinkingIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isThinking || !startTime) {
      return;
    }

    // Reset and start counting from the beginning of this thinking session
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      clearInterval(interval);
      setElapsed(0);
    };
  }, [isThinking, startTime]);

  if (!isThinking && elapsed === 0) return null;

  return (
    <div className="flex items-center gap-2 py-2">
      <div
        className={cn(
          "flex h-5 w-5 items-center justify-center",
          isThinking && "animate-spin"
        )}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="h-4 w-4 text-primary"
          aria-hidden="true"
        >
          <path
            d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Z"
            fill="currentColor"
            opacity={0.2}
          />
          <path
            d="M8 0a8 8 0 0 1 8 8h-1.5A6.5 6.5 0 0 0 8 1.5V0Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <span className="text-sm text-on-surface-variant">
        {isThinking
          ? elapsed > 0
            ? `Thinking... ${elapsed}s`
            : "Thinking..."
          : `Thought for ${elapsed}s`}
      </span>
    </div>
  );
}
