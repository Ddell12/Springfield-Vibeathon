"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import { PremiumScreen } from "../../runtime/premium-primitives";
import type { FirstThenBoardConfig } from "./schema";

export function FirstThenBoardRuntime({
  config,
  mode: _mode,
  onEvent,
  voice: _voice,
}: RuntimeProps<FirstThenBoardConfig>) {
  const [firstDone, setFirstDone] = useState(false);

  useEffect(() => {
    onEvent("app_opened");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFirstTap = useCallback(() => {
    if (firstDone) return;
    const payloadJson = JSON.stringify({ slot: "first" });
    onEvent("item_tapped", payloadJson);
    setFirstDone(true);
  }, [firstDone, onEvent]);

  const handleThenTap = useCallback(() => {
    if (!firstDone) return;
    const payloadJson = JSON.stringify({ slot: "then" });
    onEvent("activity_completed", payloadJson);
  }, [firstDone, onEvent]);

  const handleReset = useCallback(() => {
    setFirstDone(false);
    onEvent("app_opened");
  }, [onEvent]);

  return (
    <div
      className={cn(
        "p-4",
        config.highContrast && "high-contrast bg-black"
      )}
    >
      <PremiumScreen title={config.title}>
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
