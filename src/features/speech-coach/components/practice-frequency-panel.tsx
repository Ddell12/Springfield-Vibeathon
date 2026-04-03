import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

export type PracticeFrequencyData = {
  sessionsLast30Days: number;
  avgPerWeek: number;
  lastSessionAt: number | null;
  soundsSummary: Array<{ sound: string; count: number }>;
};

function formatRelativeDate(ms: number | null): string {
  if (!ms) return "No recent session";

  const diff = Date.now() - ms;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

type Props = {
  frequency: PracticeFrequencyData | null;
  adjustHref?: string;
};

export function PracticeFrequencyPanel({ frequency, adjustHref }: Props) {
  if (!frequency) {
    return (
      <div className="rounded-2xl bg-muted/20 p-4">
        <p className="text-sm text-muted-foreground">No home practice yet.</p>
      </div>
    );
  }

  const normalizedFrequency = {
    sessionsLast30Days: frequency.sessionsLast30Days ?? 0,
    avgPerWeek: frequency.avgPerWeek ?? 0,
    lastSessionAt: frequency.lastSessionAt ?? null,
    soundsSummary: Array.isArray(frequency.soundsSummary)
      ? frequency.soundsSummary
      : [],
  };
  const topSounds = normalizedFrequency.soundsSummary.slice(0, 3);

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-body text-sm font-semibold text-foreground">
            Home Practice · Last 30 days
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            A quick caseload snapshot for this child.
          </p>
        </div>
        {adjustHref ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={adjustHref}>Adjust</Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-background p-3">
          <p className="text-2xl font-semibold text-foreground">
            {normalizedFrequency.sessionsLast30Days}
          </p>
          <p className="text-xs text-muted-foreground">Sessions completed</p>
        </div>
        <div className="rounded-xl bg-background p-3">
          <p className="text-2xl font-semibold text-foreground">
            {normalizedFrequency.avgPerWeek}
          </p>
          <p className="text-xs text-muted-foreground">Average per week</p>
        </div>
        <div className="rounded-xl bg-background p-3">
          <p className="text-sm font-semibold text-foreground">
            {formatRelativeDate(normalizedFrequency.lastSessionAt)}
          </p>
          <p className="text-xs text-muted-foreground">Last practice</p>
        </div>
      </div>

      <div className="rounded-xl bg-background p-3">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Sounds practiced most
        </p>
        {topSounds.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {topSounds.map(({ sound, count }) => (
              <span
                key={sound}
                className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary"
              >
                {sound} · {count}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No target sounds recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}
