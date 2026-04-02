"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import { PremiumScreen, ProgressRail } from "../../runtime/premium-primitives";
import type { TokenBoardConfig } from "./schema";

export function TokenBoardRuntime({
  config, mode: _mode, onEvent, voice: _voice,
}: RuntimeProps<TokenBoardConfig>) {
  const [earned, setEarned] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [justFilledIndex, setJustFilledIndex] = useState<number | null>(null);
  const fillTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { onEvent("app_opened"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (fillTimeoutRef.current) clearTimeout(fillTimeoutRef.current); }, []);

  const handleTokenTap = useCallback((i: number) => {
    if (completed || i !== earned) return;
    const newEarned = earned + 1;
    setJustFilledIndex(i);
    if (fillTimeoutRef.current) clearTimeout(fillTimeoutRef.current);
    fillTimeoutRef.current = setTimeout(() => setJustFilledIndex(null), 350);
    onEvent("token_added", JSON.stringify({ tokenIndex: i, earned: newEarned }));
    setEarned(newEarned);
    if (newEarned === config.tokenCount) {
      onEvent("activity_completed", JSON.stringify({ tokensEarned: newEarned }));
      setCompleted(true);
    }
  }, [completed, earned, config.tokenCount, onEvent]);

  const handleUndo = useCallback(() => {
    if (earned === 0) return;
    setEarned((e) => e - 1);
    setCompleted(false);
  }, [earned]);

  const handleReset = useCallback(() => {
    setEarned(0);
    setCompleted(false);
    setJustFilledIndex(null);
    onEvent("app_opened");
  }, [onEvent]);

  return (
    <div className={cn("p-4 relative", config.highContrast && "high-contrast bg-black")}>
      {/* Celebration overlay */}
      {completed && (
        <div className={cn(
          "fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-8",
          config.highContrast ? "bg-black" : "bg-primary/95"
        )}>
          {config.rewardImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.rewardImageUrl} alt="reward"
              className="w-36 h-36 rounded-2xl object-cover shadow-xl" />
          )}
          <p className={cn("font-headline text-3xl font-semibold text-center",
            config.highContrast ? "text-yellow-400" : "text-white")}>
            {config.rewardLabel}
          </p>
          {!config.highContrast && <p className="text-white/80 text-lg">Great work!</p>}
          <button onClick={handleReset} aria-label="Start over"
            className={cn(
              "mt-2 px-8 py-3 rounded-full font-medium transition-colors",
              config.highContrast ? "bg-yellow-400 text-black" : "bg-white text-primary hover:bg-white/90"
            )}>
            Start over
          </button>
        </div>
      )}

      <PremiumScreen title={config.title} className="items-center">
        <ProgressRail current={earned} total={config.tokenCount}
          label={`${earned} of ${config.tokenCount} tokens earned`} />

        {/* Token row */}
        <div className="flex gap-3 flex-wrap justify-center">
          {Array.from({ length: config.tokenCount }).map((_, i) => {
            const isFilled = i < earned;
            return (
              <button key={i} onClick={() => handleTokenTap(i)} aria-label={`Token ${i + 1}`}
                disabled={isFilled || completed}
                className={cn(
                  "w-16 h-16 rounded-full touch-manipulation select-none",
                  "transition-transform duration-300",
                  isFilled ? "scale-110 border-4 border-white shadow-lg" : "opacity-40 bg-muted border-2 border-border",
                  config.highContrast && isFilled && "bg-yellow-400 border-white",
                )}
                style={isFilled ? {
                  backgroundColor: config.highContrast ? undefined : config.tokenColor,
                  animation: !config.highContrast && justFilledIndex === i
                    ? "token-fill 300ms cubic-bezier(0.4, 0, 0.2, 1) both"
                    : undefined,
                } : {}}
              />
            );
          })}
        </div>

        {/* Reward label (idle state) */}
        {!completed && (
          <div className={cn("rounded-2xl p-6 text-center max-w-sm",
            config.highContrast ? "bg-yellow-400 text-black" : "bg-muted/40")}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Reward</p>
            <p className="text-lg font-bold text-foreground">{config.rewardLabel}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button onClick={handleUndo} disabled={earned === 0} aria-label="Undo"
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              "bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed",
              config.highContrast && "bg-white text-black"
            )}>
            Undo
          </button>
          <button onClick={handleReset} aria-label="Reset"
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              "bg-muted text-muted-foreground hover:bg-muted/80",
              config.highContrast && "bg-white text-black"
            )}>
            Reset
          </button>
        </div>
      </PremiumScreen>
    </div>
  );
}
