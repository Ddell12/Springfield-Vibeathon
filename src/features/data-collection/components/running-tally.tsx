"use client";

interface RunningTallyProps {
  correct: number;
  total: number;
}

export function RunningTally({ correct, total }: RunningTallyProps) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="flex items-baseline justify-center gap-2 py-4">
      <span className="text-5xl font-bold tabular-nums">
        {correct}/{total}
      </span>
      <span className="text-2xl font-medium text-muted-foreground">
        — {accuracy}%
      </span>
    </div>
  );
}
