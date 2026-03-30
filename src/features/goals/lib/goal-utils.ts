export function formatAccuracy(accuracy: number | null): string {
  if (accuracy === null) return "\u2014";
  return `${Math.round(accuracy)}%`;
}

export function formatAccuracyWithTarget(current: number | null, target: number): string {
  if (current === null) return `\u2014 \u2192 ${target}%`;
  return `${Math.round(current)}% \u2192 ${target}%`;
}

export function trendArrow(trend: "improving" | "stable" | "declining"): string {
  switch (trend) {
    case "improving": return "\u2191";
    case "stable": return "\u2192";
    case "declining": return "\u2193";
  }
}

export function domainLabel(domain: string): string {
  const labels: Record<string, string> = {
    "articulation": "Articulation",
    "language-receptive": "Receptive Language",
    "language-expressive": "Expressive Language",
    "fluency": "Fluency",
    "voice": "Voice",
    "pragmatic-social": "Pragmatic/Social",
    "aac": "AAC",
    "feeding": "Feeding",
  };
  return labels[domain] ?? domain;
}

export function domainColor(domain: string): string {
  const colors: Record<string, string> = {
    "articulation": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "language-receptive": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    "language-expressive": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
    "fluency": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    "voice": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    "pragmatic-social": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    "aac": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
    "feeding": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  };
  return colors[domain] ?? "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
}

export function promptLevelColor(level: string | undefined): string {
  switch (level) {
    case "independent": return "#22c55e";
    case "verbal-cue": return "#eab308";
    case "model": return "#f97316";
    case "physical": return "#ef4444";
    default: return "#94a3b8";
  }
}

export function promptLevelLabel(level: string | undefined): string {
  switch (level) {
    case "independent": return "Independent";
    case "verbal-cue": return "Verbal Cue";
    case "model": return "Model";
    case "physical": return "Physical";
    default: return "Unknown";
  }
}

export function calculateStreakClient(
  dataPoints: Array<{ accuracy: number }>,
  targetAccuracy: number,
): number {
  let streak = 0;
  for (const dp of dataPoints) {
    if (dp.accuracy >= targetAccuracy) streak++;
    else break;
  }
  return streak;
}

export function checkGoalMetClient(
  targetAccuracy: number,
  targetConsecutiveSessions: number,
  dataPoints: Array<{ accuracy: number }>,
): boolean {
  return calculateStreakClient(dataPoints, targetAccuracy) >= targetConsecutiveSessions;
}

export function statusBadgeColor(status: string): string {
  switch (status) {
    case "active": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "met": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "discontinued": return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    case "modified": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    default: return "bg-gray-100 text-gray-800";
  }
}
