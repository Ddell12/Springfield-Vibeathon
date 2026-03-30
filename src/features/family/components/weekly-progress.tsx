"use client";

import { cn } from "@/core/utils";

interface WeeklyProgressProps {
  weeklyPracticeDays: number;
  weeklyTarget: number;
}

export function WeeklyProgress({ weeklyPracticeDays, weeklyTarget }: WeeklyProgressProps) {
  const pct = weeklyTarget > 0 ? Math.min((weeklyPracticeDays / weeklyTarget) * 100, 100) : 0;
  const isComplete = weeklyPracticeDays >= weeklyTarget;
  const isGood = weeklyPracticeDays >= 4;

  const barColor = isComplete
    ? "bg-success dark:bg-success"
    : isGood
      ? "bg-caution dark:bg-caution"
      : "bg-muted-foreground/40";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Practiced{" "}
          <span className={cn("font-bold", isComplete && "text-success")}>
            {weeklyPracticeDays}/{weeklyTarget}
          </span>{" "}
          days this week
        </p>
        {isComplete && (
          <span className="text-xs font-medium text-success">
            Full week! 🎉
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
            barColor
          )}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={weeklyPracticeDays}
          aria-valuemin={0}
          aria-valuemax={weeklyTarget}
          aria-label={`${weeklyPracticeDays} of ${weeklyTarget} days practiced this week`}
        />
      </div>
    </div>
  );
}
