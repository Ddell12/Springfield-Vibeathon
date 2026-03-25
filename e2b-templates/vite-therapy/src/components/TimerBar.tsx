import * as Progress from "@radix-ui/react-progress";
import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/utils";

interface TimerBarProps {
  duration: number;
  running: boolean;
  onComplete: () => void;
  className?: string;
}

export function TimerBar({ duration, running, onComplete, className }: TimerBarProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const completedRef = useRef(false);

  useEffect(() => {
    if (running && elapsed < duration) {
      completedRef.current = false;
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 0.1;
          if (next >= duration) {
            return duration;
          }
          return next;
        });
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, elapsed, duration]);

  useEffect(() => {
    if (elapsed >= duration && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [elapsed, duration, onComplete]);

  useEffect(() => {
    if (!running) setElapsed(0);
  }, [running]);

  const pct = Math.min((elapsed / duration) * 100, 100);
  const remaining = Math.max(Math.ceil(duration - elapsed), 0);

  const barColor =
    pct < 50
      ? "bg-[var(--color-success)]"
      : pct < 80
        ? "bg-[var(--color-celebration)]"
        : "bg-[var(--color-accent)]";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Progress.Root
        className="h-6 overflow-hidden rounded-full bg-[var(--color-border)]"
        value={pct}
      >
        <Progress.Indicator
          className={cn(
            "h-full rounded-full transition-transform duration-100 ease-linear",
            barColor
          )}
          style={{ transform: `translateX(-${100 - pct}%)` }}
        />
      </Progress.Root>

      <div className="flex justify-between text-sm">
        <span className="text-[var(--color-text-muted)]">
          {running ? "Time remaining" : "Ready"}
        </span>
        <span
          className={cn(
            "font-bold tabular-nums font-[var(--font-heading)]",
            pct >= 80 ? "text-[var(--color-accent)]" : "text-[var(--color-primary)]"
          )}
        >
          {remaining}s
        </span>
      </div>
    </div>
  );
}
