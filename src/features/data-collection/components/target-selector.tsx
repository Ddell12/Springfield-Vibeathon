"use client";

import { cn } from "@/core/utils";

import type { Id } from "../../../../convex/_generated/dataModel";

interface Target {
  _id: Id<"sessionTrials">;
  targetDescription: string;
  trials: Array<{ correct: boolean }>;
}

interface TargetSelectorProps {
  targets: Target[];
  activeTargetId: Id<"sessionTrials"> | null;
  onSelect: (id: Id<"sessionTrials">) => void;
}

export function TargetSelector({ targets, activeTargetId, onSelect }: TargetSelectorProps) {
  if (targets.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide">
      {targets.map((target) => {
        const total = target.trials.length;
        const correct = target.trials.filter((t) => t.correct).length;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        const isActive = target._id === activeTargetId;

        return (
          <button
            key={target._id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(target._id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-300",
              "touch-manipulation select-none whitespace-nowrap",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {target.targetDescription}
            {total > 0 && (
              <span className="ml-1 opacity-70">{accuracy}%</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
