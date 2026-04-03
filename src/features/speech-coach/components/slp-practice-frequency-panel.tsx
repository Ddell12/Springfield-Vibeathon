import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

type FrequencyData = {
  last7Count: number;
  last30Count: number;
  avgPerWeek: number;
  consistencyLabel: "High" | "Medium" | "Low";
  lastSessionAt: number | null;
  lastSessionSounds: string[];
};

const CONSISTENCY_COLORS: Record<FrequencyData["consistencyLabel"], string> = {
  High: "text-on-success-container bg-success-container",
  Medium: "text-on-caution-container bg-caution-container",
  Low: "text-on-error-container bg-error-container",
};

function formatRelativeDate(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

type Props = {
  frequency: FrequencyData | null;
  adjustHref?: string;
};

export function SlpPracticeFrequencyPanel({ frequency, adjustHref }: Props) {
  if (!frequency) {
    return (
      <div className="rounded-xl bg-muted/20 p-4">
        <p className="text-sm text-muted-foreground">No sessions yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-body text-sm font-semibold text-foreground">
          Home Practice · Last 30 days
        </h4>
        {adjustHref && (
          <Button asChild variant="ghost" size="sm">
            <Link href={adjustHref}>Adjust →</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-background p-3 text-center">
          <p className="text-2xl font-semibold text-foreground">{frequency.last7Count}</p>
          <p className="text-xs text-muted-foreground">This week</p>
        </div>
        <div className="rounded-lg bg-background p-3 text-center">
          <p className="text-2xl font-semibold text-foreground">{frequency.avgPerWeek}</p>
          <p className="text-xs text-muted-foreground">Avg / week</p>
        </div>
        <div className="rounded-lg bg-background p-3 text-center">
          <p
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CONSISTENCY_COLORS[frequency.consistencyLabel]}`}
          >
            {frequency.consistencyLabel}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Consistency</p>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Last session:</span>{" "}
        {formatRelativeDate(frequency.lastSessionAt)}
        {frequency.lastSessionSounds.length > 0 && (
          <span>
            {" "}
            — practiced{" "}
            {frequency.lastSessionSounds.map((s) => (
              <span key={s} className="font-mono font-medium text-foreground">
                {s}{" "}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
