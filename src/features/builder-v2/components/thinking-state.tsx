"use client";

import { ChevronDown, Lightbulb } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ThinkingStateProps = {
  status: string;
  isComplete?: boolean;
  plan?: string;
};

export function ThinkingState({ status, isComplete = false, plan }: ThinkingStateProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isComplete) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Reset start time — refs are mutable and safe to set inside effects
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isComplete]);

  const statusLabel = isComplete
    ? `Thought for ${elapsed}s`
    : `${status} ${elapsed}s`;

  return (
    <div className="flex w-full justify-start mb-8 pl-1" aria-live="polite">
      <div className="flex flex-col gap-3 max-w-full">
        <div className="flex items-center gap-2 text-muted text-sm font-medium" role="status">
          {!isComplete && (
            <span className="h-2 w-2 rounded-full bg-[#00595c] animate-pulse" />
          )}
          <Lightbulb size={16} />
          <span>{statusLabel}</span>
        </div>

        {plan && (
          <div className="flex flex-col gap-2">
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {plan}
            </div>

            <button className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-foreground transition-colors self-start mt-1">
              <ChevronDown size={14} />
              <span>Features for V1</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
