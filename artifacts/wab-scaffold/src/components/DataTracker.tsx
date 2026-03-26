import { Minus, Plus, RotateCcw, Timer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface DataTrackerProps {
  type: "trial" | "frequency" | "duration";
  onRecord: (data: { count: number; percentage?: number; duration?: number }) => void;
  targetCount?: number;
}

export function DataTracker({ type, onRecord, targetCount }: DataTrackerProps) {
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [count, setCount] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const total = correct + incorrect;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const save = useCallback(() => {
    if (type === "trial") onRecord({ count: total, percentage: pct });
    else if (type === "frequency") onRecord({ count });
    else onRecord({ count: 1, duration: seconds });
  }, [type, total, pct, count, seconds, onRecord]);

  const reset = () => {
    setCorrect(0);
    setIncorrect(0);
    setCount(0);
    setSeconds(0);
    setRunning(false);
  };

  if (type === "trial") {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-5xl font-bold text-[var(--color-primary)] font-[var(--font-heading)]">
          {pct}%
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          {correct} correct / {total} trials
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setCorrect((c) => c + 1)}
            className="btn-primary flex items-center gap-2 bg-[var(--color-success)]! min-w-[120px] justify-center"
          >
            <Plus className="h-5 w-5" /> Correct
          </button>
          <button
            onClick={() => setIncorrect((c) => c + 1)}
            className="btn-secondary flex items-center gap-2 min-w-[120px] justify-center text-red-600 border-red-300"
          >
            <Minus className="h-5 w-5" /> Incorrect
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="btn-primary text-sm px-4 py-2">Save Session</button>
          <button onClick={reset} className="btn-secondary text-sm px-4 py-2">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (type === "frequency") {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-6xl font-bold text-[var(--color-primary)] font-[var(--font-heading)]">
          {count}
        </div>
        {targetCount && (
          <p className="text-sm text-[var(--color-text-muted)]">
            Target: {targetCount}
          </p>
        )}
        <button
          onClick={() => setCount((c) => c + 1)}
          className={cn(
            "tap-target h-24 w-24 rounded-full text-3xl font-bold text-white transition-all duration-200",
            "bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] active:scale-90",
            "shadow-[0_4px_12px_rgba(0,89,92,0.3)]"
          )}
        >
          +1
        </button>
        <div className="flex gap-2">
          <button onClick={save} className="btn-primary text-sm px-4 py-2">Save</button>
          <button onClick={reset} className="btn-secondary text-sm px-4 py-2">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Duration
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 text-5xl font-bold font-[var(--font-heading)] tabular-nums">
        <Timer className={cn("h-8 w-8", running ? "text-[var(--color-accent)] animate-pulse" : "text-[var(--color-text-muted)]")} />
        {formatTime(seconds)}
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => setRunning(!running)}
          className={cn("btn-primary min-w-[120px]", running && "bg-[var(--color-accent)]!")}
        >
          {running ? "Stop" : "Start"}
        </button>
        <button onClick={reset} className="btn-secondary">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
      {seconds > 0 && !running && (
        <button onClick={save} className="btn-primary text-sm px-4 py-2">
          Save ({formatTime(seconds)})
        </button>
      )}
    </div>
  );
}
