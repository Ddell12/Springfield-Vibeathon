export type Frequency = "daily" | "3x-week" | "weekly" | "as-needed";

/**
 * Returns true if a home-program goal with the given frequency should be
 * practiced today, given how many times it has already been practiced this week.
 *
 * @param frequency - Goal recurrence frequency
 * @param timesThisWeek - Number of practice sessions logged this week so far
 */
export function isDueToday(frequency: Frequency, timesThisWeek: number): boolean {
  switch (frequency) {
    case "daily":
      return true;
    case "3x-week":
      return timesThisWeek < 3;
    case "weekly":
      return timesThisWeek < 1;
    case "as-needed":
      return true;
  }
}

/**
 * Returns a numeric sort key for a frequency value.
 * Lower numbers sort first (most urgent / most frequent).
 *
 * Order: daily (0) < 3x-week (1) < weekly (2) < as-needed (3)
 */
export function frequencySortOrder(frequency: Frequency): number {
  const order: Record<Frequency, number> = {
    daily: 0,
    "3x-week": 1,
    weekly: 2,
    "as-needed": 3,
  };
  return order[frequency];
}
