type Props = {
  elapsedMs: number;
  durationMs: number;
  onDismiss: () => void;
};

function getTip(elapsedMs: number, durationMs: number): string {
  const remainingMs = durationMs - elapsedMs;
  if (elapsedMs < 60_000) {
    return "The coach has this — just smile and wait. No need to prompt.";
  }
  if (remainingMs < 60_000) {
    return "Almost done — great job today! Just a little longer.";
  }
  return "A thumbs up goes a long way. Keep cheering them on!";
}

export function CaregiverGuidanceStrip({ elapsedMs, durationMs, onDismiss }: Props) {
  const tip = getTip(elapsedMs, durationMs);
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-container px-4 py-3 text-sm">
      <p className="text-on-surface-variant">{tip}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-xs font-medium text-primary underline"
      >
        Hide
      </button>
    </div>
  );
}
