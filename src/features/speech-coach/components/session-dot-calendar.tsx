import { cn } from "@/core/utils";

type Props = {
  sessionTimestamps: number[];
  nowMs?: number;
};

function toDateString(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { weekday: "short" });
}

function toIsoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function SessionDotCalendar({ sessionTimestamps, nowMs }: Props) {
  const now = nowMs ?? Date.now();
  const sessionDays = new Set(sessionTimestamps.map(toIsoDay));

  // Last 7 days, oldest first
  const days = Array.from({ length: 7 }, (_, i) => {
    const ms = now - (6 - i) * 24 * 60 * 60 * 1000;
    return { ms, isoDay: toIsoDay(ms), label: toDateString(ms) };
  });

  return (
    <div className="flex items-end gap-3">
      {days.map(({ isoDay, label }) => {
        const hasSessions = sessionDays.has(isoDay);
        return (
          <div
            key={isoDay}
            data-testid="calendar-day"
            data-filled={String(hasSessions)}
            className="flex flex-col items-center gap-1.5"
          >
            <span
              className={cn(
                "h-3 w-3 rounded-full",
                hasSessions ? "bg-primary" : "bg-muted"
              )}
              aria-label={hasSessions ? `Session on ${label}` : `No session on ${label}`}
            />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
