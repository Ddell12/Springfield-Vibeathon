import { Check, Circle } from "lucide-react";
import * as Progress from "@radix-ui/react-progress";

import { cn } from "../lib/utils";

interface ScheduleStep {
  label: string;
  icon?: string;
  done: boolean;
}

interface VisualScheduleProps {
  steps: ScheduleStep[];
  onToggle: (index: number) => void;
}

export function VisualSchedule({ steps, onToggle }: VisualScheduleProps) {
  const currentIndex = steps.findIndex((s) => !s.done);
  const completedCount = steps.filter((s) => s.done).length;
  const pct = (completedCount / steps.length) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-muted)]">Progress</span>
        <span className="text-sm font-semibold text-[var(--color-primary)]">
          {completedCount} of {steps.length}
        </span>
      </div>

      <Progress.Root
        className="h-2.5 overflow-hidden rounded-full bg-[var(--color-border)]"
        value={pct}
      >
        <Progress.Indicator
          className="h-full rounded-full bg-[var(--color-success)] transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ transform: `translateX(-${100 - pct}%)` }}
        />
      </Progress.Root>

      <div className="flex flex-col gap-2 mt-2">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => onToggle(i)}
            className={cn(
              "schedule-step gap-3 text-left",
              step.done && "completed",
              i === currentIndex && "ring-2 ring-[var(--color-primary)] ring-offset-1"
            )}
            aria-label={`${step.done ? "Completed" : "Mark complete"}: ${step.label}`}
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-200">
              {step.done ? (
                <Check className="h-5 w-5 text-[var(--color-success)]" />
              ) : step.icon ? (
                <span className="text-xl">{step.icon}</span>
              ) : (
                <Circle className="h-5 w-5 text-[var(--color-text-muted)]" />
              )}
            </span>

            <span
              className={cn(
                "step-text flex-1 font-medium",
                i === currentIndex && !step.done && "text-[var(--color-primary)] font-bold"
              )}
            >
              {step.label}
            </span>

            {i === currentIndex && !step.done && (
              <span className="text-xs rounded-full bg-[var(--color-primary-bg)] px-2 py-0.5 font-semibold text-[var(--color-primary)]">
                NOW
              </span>
            )}
          </button>
        ))}
      </div>

      {completedCount === steps.length && (
        <p className="mt-2 text-center text-lg font-bold text-[var(--color-success)]">
          🎉 All done!
        </p>
      )}
    </div>
  );
}
