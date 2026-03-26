import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface StepItemProps {
  image?: string;
  label: string;
  status: "pending" | "current" | "done";
  onComplete: () => void;
}

export function StepItem({ image, label, status, onComplete }: StepItemProps) {
  return (
    <button
      onClick={status !== "done" ? onComplete : undefined}
      disabled={status === "done"}
      aria-label={`${status === "done" ? "Completed" : status === "current" ? "Current step" : "Upcoming"}: ${label}`}
      className={cn(
        "schedule-step w-full text-left min-h-[60px]",
        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        status === "done" && "completed",
        status === "current" && "ring-2 ring-[var(--color-primary)] ring-offset-1"
      )}
    >
      {image && (
        <span
          className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
            "bg-[var(--color-primary-bg)] text-xl"
          )}
          role="img"
          aria-hidden="true"
        >
          {image}
        </span>
      )}

      <span
        className={cn(
          "step-text flex-1 font-medium text-[var(--color-text)]",
          status === "current" && "font-bold text-[var(--color-primary)]",
          status === "done" && "text-[var(--color-text-muted)]"
        )}
      >
        {label}
      </span>

      <span className="flex-shrink-0">
        {status === "done" ? (
          <Check className="h-5 w-5 text-[var(--color-success)]" />
        ) : status === "current" ? (
          <span className="text-xs rounded-full bg-[var(--color-primary-bg)] px-2 py-0.5 font-semibold text-[var(--color-primary)]">
            NOW
          </span>
        ) : null}
      </span>
    </button>
  );
}
