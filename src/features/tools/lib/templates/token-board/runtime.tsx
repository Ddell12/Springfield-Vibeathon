"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import { PremiumScreen, ProgressRail, ReinforcementBanner } from "../../runtime/premium-primitives";
import type { TokenBoardConfig } from "./schema";

const TOKEN_EMOJI: Record<string, string> = {
  star: "⭐",
  circle: "🔵",
  heart: "❤️",
};

const EMPTY_EMOJI: Record<string, string> = {
  star: "☆",
  circle: "⚪",
  heart: "🤍",
};

export function TokenBoardRuntime({
  config,
  mode: _mode,
  onEvent,
  voice: _voice,
}: RuntimeProps<TokenBoardConfig>) {
  const [earned, setEarned] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    onEvent("app_opened");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTokenTap = useCallback(
    (tokenIndex: number) => {
      if (completed || tokenIndex !== earned) return;
      const newEarned = earned + 1;
      const payloadJson = JSON.stringify({ tokenIndex, earned: newEarned });
      onEvent("token_added", payloadJson);
      setEarned(newEarned);

      if (newEarned === config.tokenCount) {
        const completedPayload = JSON.stringify({ tokensEarned: newEarned });
        onEvent("activity_completed", completedPayload);
        setCompleted(true);
      }
    },
    [completed, earned, config.tokenCount, onEvent]
  );

  const handleReset = useCallback(() => {
    setEarned(0);
    setCompleted(false);
    onEvent("app_opened");
  }, [onEvent]);

  return (
    <div
      className={cn(
        "p-4",
        config.highContrast && "high-contrast bg-black"
      )}
    >
      <PremiumScreen title={config.title} className="items-center">
        <ProgressRail
          current={earned}
          total={config.tokenCount}
          label={`${earned} of ${config.tokenCount} tokens earned`}
        />

        {completed ? (
          <ReinforcementBanner
            title="Goal reached!"
            body={config.rewardLabel}
            className="w-full max-w-sm"
          />
        ) : (
          <>
            <div className="flex gap-3 flex-wrap justify-center">
              {Array.from({ length: config.tokenCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleTokenTap(i)}
                  aria-label={`Token ${i + 1}`}
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center text-3xl",
                    "touch-manipulation select-none transition-all duration-300",
                    "active:scale-95",
                    i < earned
                      ? "scale-110"
                      : "opacity-40"
                  )}
                >
                  {i < earned
                    ? TOKEN_EMOJI[config.tokenShape]
                    : EMPTY_EMOJI[config.tokenShape]}
                </button>
              ))}
            </div>

            <div
              className={cn(
                "rounded-2xl p-6 text-center max-w-sm",
                config.highContrast
                  ? "bg-yellow-400 text-black"
                  : "bg-surface-container"
              )}
            >
              <p
                className={cn(
                  "text-sm font-medium uppercase tracking-wide mb-1",
                  config.highContrast ? "text-black/70" : "text-muted-foreground"
                )}
              >
                Reward
              </p>
              <p
                className={cn(
                  "text-lg font-bold",
                  config.highContrast ? "text-black" : "text-foreground"
                )}
              >
                {config.rewardLabel}
              </p>
            </div>
          </>
        )}

        <button
          onClick={handleReset}
          aria-label="Reset"
          className={cn(
            "px-6 py-2 rounded-full text-sm font-medium",
            "transition-colors duration-300",
            config.highContrast
              ? "bg-white text-black hover:bg-gray-200"
              : "bg-surface-container text-muted-foreground hover:bg-surface-container-high"
          )}
        >
          Reset
        </button>
      </PremiumScreen>
    </div>
  );
}
