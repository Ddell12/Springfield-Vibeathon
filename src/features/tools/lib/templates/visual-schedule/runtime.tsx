"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import { PremiumScreen, ProgressRail, ReinforcementBanner } from "../../runtime/premium-primitives";
import type { VisualScheduleConfig } from "./schema";

export function VisualScheduleRuntime({
  config,
  mode,
  onEvent,
  voice,
}: RuntimeProps<VisualScheduleConfig>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    onEvent("app_opened");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    setCompleted(false);
    onEvent("app_opened");
  }, [onEvent]);

  const handleItemTap = useCallback(
    (index: number) => {
      if (completed || index !== currentIndex) return;
      const item = config.items[index];
      const payloadJson = JSON.stringify({ itemId: item.id, label: item.label, index });
      onEvent("item_tapped", payloadJson);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= config.items.length) {
        setCompleted(true);
        const completedPayload = JSON.stringify({ itemsCompleted: config.items.length });
        onEvent("activity_completed", completedPayload);
      } else {
        setCurrentIndex(nextIndex);
      }
    },
    [completed, currentIndex, config.items, onEvent]
  );

  return (
    <div
      className={cn(
        "p-4",
        config.highContrast && "high-contrast bg-black"
      )}
    >
      <PremiumScreen title={config.title}>
        <ProgressRail
          current={completed ? config.items.length : currentIndex}
          total={config.items.length}
          label={completed ? "All done!" : `Step ${currentIndex + 1} of ${config.items.length}`}
        />

        {completed ? (
          <div className="flex flex-col items-center gap-4">
            <ReinforcementBanner
              title="All done! Great work!"
              className="w-full"
            />
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-xl bg-surface-container text-sm font-medium"
            >
              Start again
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {config.items.map((item, index) => {
            const isDone = index < currentIndex;
            const isActive = index === currentIndex;
            return (
              <button
                key={item.id}
                data-active={isActive ? "true" : undefined}
                onClick={() => handleItemTap(index)}
                className={cn(
                  "flex items-center gap-4 rounded-2xl p-4 text-left",
                  "touch-manipulation select-none transition-all duration-300",
                  isActive && "scale-[1.02]",
                  isDone
                    ? config.highContrast
                      ? "bg-gray-700 text-gray-400"
                      : "bg-muted/50 text-muted-foreground"
                    : isActive
                      ? config.highContrast
                        ? "bg-yellow-400 text-black border-4 border-white"
                        : "bg-primary text-primary-foreground shadow-lg"
                      : config.highContrast
                        ? "bg-gray-800 text-white border-2 border-gray-600"
                        : "bg-muted text-foreground"
                )}
              >
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.label}
                    className="w-14 h-14 object-cover rounded-xl flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold">{item.label}</p>
                  {config.showDuration && item.durationMinutes !== undefined && (
                    <p className="text-sm opacity-70">{item.durationMinutes} min</p>
                  )}
                </div>
                {config.showCheckmarks && isDone && (
                  <span className="text-2xl flex-shrink-0">✓</span>
                )}
                {isActive && (
                  <span className="text-2xl flex-shrink-0">→</span>
                )}
              </button>
            );
          })}
          </div>
        )}
      </PremiumScreen>
    </div>
  );
}
