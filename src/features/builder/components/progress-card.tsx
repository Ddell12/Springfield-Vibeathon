"use client";

import { useMemo } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

import type { Activity, StreamingStatus } from "../hooks/use-streaming";

interface ProgressCardProps {
  status: StreamingStatus;
  activities: Activity[];
  startTime: number;
}

const PHASES = [
  { label: "Understanding your request", icon: "psychology" },
  { label: "Writing components", icon: "code" },
  { label: "Bundling & styling", icon: "palette" },
  { label: "Ready to preview", icon: "check_circle" },
] as const;

function derivePhase(status: StreamingStatus, activities: Activity[]): number {
  if (status === "live") return 4;
  if (status === "idle" || status === "failed") return 0;

  const hasWritingFile = activities.some((a) => a.type === "writing_file");
  const hasFileWritten = activities.some((a) => a.type === "file_written");
  const hasComplete = activities.some((a) => a.type === "complete");

  if (hasComplete) return 4;
  if (hasFileWritten) return 3;
  if (hasWritingFile) return 2;
  return 1;
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

export function ProgressCard({ status, activities, startTime }: ProgressCardProps) {
  const phase = useMemo(() => derivePhase(status, activities), [status, activities]);

  if (status === "idle") return null;

  const isComplete = status === "live";
  const elapsed = Date.now() - startTime;

  const progressPercent = isComplete ? 100 : Math.min((phase / PHASES.length) * 100, 95);

  return (
    <div className="rounded-2xl bg-surface-container-low p-4" role="status" aria-live="polite">
      {isComplete ? (
        <div className="flex items-center gap-2">
          <MaterialIcon icon="check_circle" size="sm" className="text-primary" filled />
          <span className="text-sm font-medium text-primary">
            Built in {formatDuration(elapsed)}
          </span>
        </div>
      ) : (
        <p className="mb-3 font-headline text-sm font-semibold text-on-surface">
          Building your app...
        </p>
      )}

      <ol className={cn("space-y-2", !isComplete && "mb-3")}>
        {PHASES.map((p, i) => {
          const stepIndex = i + 1;
          const isDone = isComplete || phase > stepIndex;
          const isActive = !isComplete && phase === stepIndex;

          return (
            <li key={p.label} className="flex items-center gap-2.5">
              {isDone ? (
                <MaterialIcon icon="check_circle" size="xs" className="text-primary" filled />
              ) : isActive ? (
                <MaterialIcon icon="progress_activity" size="xs" className="animate-spin text-primary" />
              ) : (
                <MaterialIcon icon="radio_button_unchecked" size="xs" className="text-on-surface-variant/40" />
              )}
              <span
                className={cn(
                  "text-sm transition-colors duration-300",
                  isDone && "text-primary font-medium",
                  isActive && "text-on-surface font-medium",
                  !isDone && !isActive && "text-on-surface-variant/60",
                )}
              >
                {p.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Progress bar */}
      {!isComplete && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-outline-variant/20">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
