"use client";

import { useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";

import { api } from "@convex/_generated/api";
import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
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
  shareToken,
  onEvent,
}: RuntimeProps<TokenBoardConfig>) {
  const logEvent = useMutation(api.tools.logEvent);
  const [earned, setEarned] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (shareToken !== "preview") {
      void logEvent({ shareToken, eventType: "app_opened" });
    }
    onEvent("app_opened");
  }, [shareToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTokenTap = useCallback(
    (tokenIndex: number) => {
      if (completed || tokenIndex !== earned) return;
      const newEarned = earned + 1;
      const payloadJson = JSON.stringify({ tokenIndex, earned: newEarned });
      if (shareToken !== "preview") {
        void logEvent({ shareToken, eventType: "token_added", eventPayloadJson: payloadJson });
      }
      onEvent("token_added", payloadJson);
      setEarned(newEarned);

      if (newEarned === config.tokenCount) {
        const completedPayload = JSON.stringify({ tokensEarned: newEarned });
        if (shareToken !== "preview") {
          void logEvent({ shareToken, eventType: "activity_completed", eventPayloadJson: completedPayload });
        }
        onEvent("activity_completed", completedPayload);
        setCompleted(true);
      }
    },
    [completed, earned, config.tokenCount, logEvent, shareToken, onEvent]
  );

  const handleReset = useCallback(() => {
    setEarned(0);
    setCompleted(false);
    if (shareToken !== "preview") {
      void logEvent({ shareToken, eventType: "app_opened" });
    }
    onEvent("app_opened");
  }, [logEvent, shareToken, onEvent]);

  return (
    <div
      className={cn(
        "min-h-screen bg-background p-4 flex flex-col gap-6 items-center",
        config.highContrast && "high-contrast bg-black"
      )}
    >
      <h1
        className={cn(
          "text-center font-display text-2xl font-semibold",
          config.highContrast ? "text-white" : "text-foreground"
        )}
      >
        {config.title}
      </h1>

      {completed ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <span className="text-6xl">🎉</span>
          <p
            className={cn(
              "text-xl font-bold text-center",
              config.highContrast ? "text-white" : "text-foreground"
            )}
          >
            Great job!
          </p>
          <p
            className={cn(
              "text-lg text-center",
              config.highContrast ? "text-yellow-300" : "text-muted-foreground"
            )}
          >
            {config.rewardLabel}
          </p>
        </div>
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
                  "touch-manipulation select-none transition-all duration-200",
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
                : "bg-muted"
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
          "transition-colors duration-200",
          config.highContrast
            ? "bg-white text-black hover:bg-gray-200"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        Reset
      </button>
    </div>
  );
}
