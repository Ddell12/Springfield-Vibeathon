"use client";

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

export function PhaseTimeline({ phases, currentIndex: _currentIndex }: PhaseTimelineProps) {
  return (
    <div className="flex items-center gap-1 border-t px-4 py-3">
      {phases.map((phase) => (
        <div
          key={phase._id}
          className="group relative flex-1"
          title={`${phase.name}: ${phase.status}`}
        >
          <div
            className={cn(
              "h-2 rounded-full transition-colors",
              STATUS_COLORS[phase.status] ?? "bg-muted"
            )}
          />
          <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-0.5 text-xs text-popover-foreground shadow-sm group-hover:block">
            {phase.name}
          </span>
        </div>
      ))}
    </div>
  );
}
