export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}min`;
}

export function calculateAccuracy(
  correct?: number,
  trials?: number
): number | null {
  if (!trials || trials === 0) return null;
  if (correct === undefined || correct === null) return null;
  return Math.round((correct / trials) * 100);
}

export function accuracyColor(accuracy: number | null): string {
  if (accuracy === null) return "text-muted-foreground";
  if (accuracy >= 80) return "text-success";
  if (accuracy >= 60) return "text-caution";
  return "text-error";
}

export function accuracyLabel(accuracy: number | null): string {
  if (accuracy === null) return "\u2014";
  return accuracy >= 80 ? `${accuracy}% \u2713` : `${accuracy}%`;
}
