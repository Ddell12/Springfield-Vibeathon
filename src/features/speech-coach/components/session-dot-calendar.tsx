import { cn } from "@/core/utils";

type SessionCalendarEntry = {
  startedAt: number;
  endedAt?: number | null;
  durationMs?: number | null;
  summary?: string;
  targetSounds?: string[];
};

type Props = {
  sessionTimestamps?: number[];
  sessions?: SessionCalendarEntry[];
  nowMs?: number;
};

function toLocalIsoDay(ms: number): string {
  const date = new Date(ms);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayLabel(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatShortWeekday(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { weekday: "short" });
}

function formatDuration(entry: SessionCalendarEntry) {
  const durationMs =
    entry.durationMs ??
    (entry.endedAt && entry.endedAt > entry.startedAt
      ? entry.endedAt - entry.startedAt
      : null);

  if (!durationMs) return null;

  const minutes = Math.round(durationMs / 60000);
  return `${minutes} min`;
}

export function SessionDotCalendar({
  sessionTimestamps,
  sessions,
  nowMs,
}: Props) {
  const now = nowMs ?? Date.now();
  const normalizedSessions: SessionCalendarEntry[] =
    sessions ??
    (sessionTimestamps ?? []).map((timestamp) => ({ startedAt: timestamp }));
  const sessionDays = new Set(
    normalizedSessions.map((session) => toLocalIsoDay(session.startedAt))
  );

  const days = Array.from({ length: 30 }, (_, i) => {
    const ms = now - (29 - i) * 24 * 60 * 60 * 1000;
    return {
      ms,
      isoDay: toLocalIsoDay(ms),
      weekday: formatShortWeekday(ms),
      label: formatDayLabel(ms),
    };
  });

  const recentSessions = [...normalizedSessions]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-muted/20 p-4">
      <div>
        <h4 className="font-body text-sm font-semibold text-foreground">
          Practice consistency
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">
          Filled dots show practice days from the last 30 days.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {days.map(({ isoDay, weekday, label }) => {
          const hasSessions = sessionDays.has(isoDay);
          return (
            <div
              key={isoDay}
              data-testid="calendar-day"
              data-filled={String(hasSessions)}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-background/70 px-2 py-2"
            >
              <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                {weekday}
              </span>
              <span
                className={cn(
                  "h-3 w-3 rounded-full",
                  hasSessions ? "bg-primary" : "bg-muted"
                )}
                aria-label={hasSessions ? `Session on ${label}` : `No session on ${label}`}
              />
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          );
        })}
      </div>

      {recentSessions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Recent sessions
          </p>
          {recentSessions.map((session) => (
            <div
              key={`${session.startedAt}-${session.summary ?? "session"}`}
              className="flex flex-wrap items-center gap-2 rounded-xl bg-background px-3 py-2 text-sm"
            >
              <span className="font-medium text-foreground">
                {formatDayLabel(session.startedAt)}
              </span>
              {session.targetSounds && session.targetSounds.length > 0 ? (
                <span className="font-mono text-xs text-foreground">
                  {session.targetSounds.join(" ")}
                </span>
              ) : null}
              {formatDuration(session) ? (
                <span className="text-muted-foreground">{formatDuration(session)}</span>
              ) : null}
              {session.summary ? (
                <span className="text-muted-foreground">✨ {session.summary}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No completed sessions yet.
        </p>
      )}
    </div>
  );
}
