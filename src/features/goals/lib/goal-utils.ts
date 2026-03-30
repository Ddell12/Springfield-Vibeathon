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
    "articulation": "bg-domain-blue-container text-on-domain-blue",
    "language-receptive": "bg-domain-purple-container text-on-domain-purple",
    "language-expressive": "bg-domain-purple-container text-on-domain-purple",
    "fluency": "bg-domain-emerald-container text-on-domain-emerald",
    "voice": "bg-domain-orange-container text-on-domain-orange",
    "pragmatic-social": "bg-domain-pink-container text-on-domain-pink",
    "aac": "bg-domain-teal-container text-on-domain-teal",
    "feeding": "bg-domain-amber-container text-on-domain-amber",
  };
  return colors[domain] ?? "bg-domain-neutral-container text-on-domain-neutral";
}

export function promptLevelColor(level: string | undefined): string {
  switch (level) {
    case "independent": return "var(--color-chart-success)";
    case "verbal-cue": return "var(--color-chart-caution)";
    case "model": return "var(--color-chart-warning)";
    case "physical": return "var(--color-chart-danger)";
    default: return "var(--color-chart-muted)";
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
    case "active": return "bg-success-container text-on-success-container";
    case "met": return "bg-info-container text-on-info-container";
    case "discontinued": return "bg-domain-neutral-container text-on-domain-neutral";
    case "modified": return "bg-caution-container text-on-caution-container";
    default: return "bg-domain-neutral-container text-on-domain-neutral";
  }
}
