"use client";

import { useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";

import { api } from "@convex/_generated/api";
import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import type { FirstThenBoardConfig } from "./schema";

export function FirstThenBoardRuntime({
  config,
  shareToken,
  onEvent,
}: RuntimeProps<FirstThenBoardConfig>) {
  const logEvent = useMutation(api.tools.logEvent);
  const [firstDone, setFirstDone] = useState(false);

  useEffect(() => {
    if (shareToken !== "preview") {
      void logEvent({ shareToken, eventType: "app_opened" });
    }
    onEvent("app_opened");
  }, [shareToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFirstTap = useCallback(() => {
    if (firstDone) return;
    const payloadJson = JSON.stringify({ slot: "first" });
    if (shareToken !== "preview") {
      void logEvent({ shareToken, eventType: "item_tapped", eventPayloadJson: payloadJson });
    }
    onEvent("item_tapped", payloadJson);
    setFirstDone(true);
  }, [firstDone, logEvent, shareToken, onEvent]);

  const handleThenTap = useCallback(() => {
    if (!firstDone) return;
    const payloadJson = JSON.stringify({ slot: "then" });
    if (shareToken !== "preview") {
      void logEvent({ shareToken, eventType: "activity_completed", eventPayloadJson: payloadJson });
    }
    onEvent("activity_completed", payloadJson);
  }, [firstDone, logEvent, shareToken, onEvent]);

  const handleReset = useCallback(() => {
    setFirstDone(false);
    if (shareToken !== "preview") {
      void logEvent({ shareToken, eventType: "app_opened" });
    }
    onEvent("app_opened");
  }, [logEvent, shareToken, onEvent]);

  return (
    <div
      className={cn(
        "min-h-screen bg-background p-4 flex flex-col gap-6",
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

      <div className="flex flex-col md:flex-row gap-4 flex-1">
        {/* FIRST card */}
        <button
          onClick={handleFirstTap}
          disabled={firstDone}
          aria-label={config.firstLabel}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-4 rounded-2xl p-8",
            "min-h-[200px] touch-manipulation select-none relative",
            "transition-all duration-300 active:scale-95",
            config.highContrast
              ? "bg-blue-500 text-white border-4 border-white"
              : "text-white"
          )}
          style={config.highContrast ? undefined : { backgroundColor: config.firstColor }}
        >
          <span className="text-sm font-bold uppercase tracking-widest opacity-70">First</span>
          {config.firstImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.firstImageUrl}
              alt={config.firstLabel}
              className="w-24 h-24 object-cover rounded-xl"
            />
          )}
          <span className="text-2xl font-bold text-center">{config.firstLabel}</span>
          {firstDone && config.showCheckmark && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
              <span className="text-6xl">✓</span>
            </div>
          )}
        </button>

        {/* THEN card */}
        <button
          onClick={handleThenTap}
          disabled={!firstDone}
          aria-label={config.thenLabel}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-4 rounded-2xl p-8",
            "min-h-[200px] touch-manipulation select-none",
            "transition-all duration-300 active:scale-95",
            !firstDone && "opacity-50 cursor-not-allowed",
            config.highContrast
              ? "bg-green-500 text-white border-4 border-white"
              : "text-white"
          )}
          style={config.highContrast ? undefined : { backgroundColor: config.thenColor }}
        >
          <span className="text-sm font-bold uppercase tracking-widest opacity-70">Then</span>
          {config.thenImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.thenImageUrl}
              alt={config.thenLabel}
              className="w-24 h-24 object-cover rounded-xl"
            />
          )}
          <span className="text-2xl font-bold text-center">{config.thenLabel}</span>
        </button>
      </div>

      <button
        onClick={handleReset}
        aria-label="Reset"
        className={cn(
          "mx-auto px-6 py-2 rounded-full text-sm font-medium",
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
