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

/**
 * Returns true if a session note was signed more than 24 hours after
 * the end of its session date. Medicare and most payers expect same-day
 * signatures; late signatures can be flagged in audits.
 *
 * Assumes all timestamps are UTC epoch milliseconds and sessionDate is
 * a YYYY-MM-DD string representing a UTC calendar day — which is true
 * throughout the Bridges data model (Convex stores timestamps as Date.now()).
 */
export function isLateSignature(
  signedAt: number | undefined,
  sessionDate: string,
): boolean {
  if (!signedAt || !sessionDate) return false;
  // End of session day = start of next UTC day (more precise than T23:59:59Z)
  const sessionDayStart = new Date(sessionDate + "T00:00:00Z");
  const sessionEnd = sessionDayStart.getTime() + 24 * 60 * 60 * 1000;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  return signedAt - sessionEnd > twentyFourHoursMs;
}

/**
 * Returns the number of calendar days between the session date and
 * the signature timestamp, or null if unsigned.
 */
export function getSignatureDelayDays(
  signedAt: number | undefined,
  sessionDate: string,
): number | null {
  if (!signedAt || !sessionDate) return null;
  const sessionDay = new Date(sessionDate + "T00:00:00Z").getTime();
  const diffMs = signedAt - sessionDay;
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}
