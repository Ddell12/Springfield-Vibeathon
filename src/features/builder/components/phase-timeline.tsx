"use client";

import { motion } from "motion/react";

import { cn } from "@/core/utils";

interface Phase {
  _id: string;
  name: string;
  status: string;
  index: number;
}

interface PhaseTimelineProps {
  phases: Phase[];
  currentIndex: number;
  onPhaseClick?: (index: number) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted",
  generating: "bg-blue-500",
  implementing: "bg-blue-500",
  deploying: "bg-blue-400",
  validating: "bg-blue-300",
  completed: "bg-green-500",
  failed: "bg-red-500",
};

export function PhaseTimeline({ phases, currentIndex, onPhaseClick }: PhaseTimelineProps) {
  return (
    <div className="bg-surface-container-lowest px-4 py-3">
      <div className="flex items-center gap-1.5">
        {phases.map((phase) => {
          const isActive =
            phase.index === currentIndex &&
            !["completed", "failed", "pending"].includes(phase.status);
          return (
            <button
              key={phase._id}
              className="group relative flex-1"
              onClick={() => onPhaseClick?.(phase.index)}
              title={`${phase.name}: ${phase.status}`}
            >
              <motion.div
                className={cn(
                  "h-3 rounded-full transition-all duration-300",
                  STATUS_COLORS[phase.status] ?? "bg-surface-container-highest",
                  isActive && "ring-2 ring-primary/50"
                )}
                animate={isActive ? { opacity: [0.7, 1, 0.7] } : { opacity: 1 }}
                transition={
                  isActive
                    ? { repeat: Infinity, duration: 1.5 }
                    : {}
                }
              />
              {/* Phase label below */}
              <span className="mt-1 block truncate text-center text-[10px] text-on-surface-variant/60">
                {phase.name}
              </span>
              {/* Status icon */}
              <span className="absolute -top-1 right-0 text-[10px]">
                {phase.status === "completed" && (
                  <span className="material-symbols-outlined text-xs text-primary">
                    check_circle
                  </span>
                )}
                {isActive && (
                  <span className="material-symbols-outlined animate-spin text-xs text-secondary">
                    progress_activity
                  </span>
                )}
                {phase.status === "failed" && (
                  <span className="material-symbols-outlined text-xs text-error">
                    error
                  </span>
                )}
              </span>
              {/* Hover tooltip */}
              <span className="absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-inverse-surface px-2.5 py-1 text-xs text-inverse-on-surface sanctuary-shadow group-hover:block">
                {phase.name}: {phase.status}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
