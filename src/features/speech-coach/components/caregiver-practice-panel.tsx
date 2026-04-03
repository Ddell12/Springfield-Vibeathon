"use client";

import { Button } from "@/shared/components/ui/button";

type LatestProgress = {
  summary: string;
  recommendedNextFocus: string[];
  insights?: { homePracticeNotes: string[] };
  analyzedAt: number;
};

type Props = {
  sessionsThisWeek: number;
  lastProgress: LatestProgress | null;
  onStartSession: () => void;
};

function formatRelativeDate(ms: number): string {
  const diff = Date.now() - ms;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function CaregiverPracticePanel({ sessionsThisWeek, lastProgress, onStartSession }: Props) {
  const homeTip = lastProgress?.insights?.homePracticeNotes?.[0];

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-surface-container-lowest p-5">
      {/* Sessions this week */}
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">🔥</span>
        <span className="text-sm font-semibold text-foreground">
          {sessionsThisWeek} {sessionsThisWeek === 1 ? "session" : "sessions"} this week
        </span>
      </div>

      {/* Last session summary */}
      {lastProgress && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Last session:</span>{" "}
          {formatRelativeDate(lastProgress.analyzedAt)}
          {lastProgress.summary && (
            <p className="mt-1 text-sm text-foreground line-clamp-2">{lastProgress.summary}</p>
          )}
        </div>
      )}

      {/* This week's focus + Start CTA */}
      {lastProgress?.recommendedNextFocus && lastProgress.recommendedNextFocus.length > 0 && (
        <div className="rounded-xl bg-primary/8 p-3">
          <p className="text-xs font-medium text-muted-foreground">This week&apos;s focus</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {lastProgress.recommendedNextFocus.map((s) => (
              <span key={s} className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <Button
        type="button"
        onClick={onStartSession}
        className="w-full bg-gradient-to-br from-[#00595c] to-[#0d7377] font-semibold"
      >
        Start a session
      </Button>

      {/* Home practice tip */}
      {homeTip && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">Home practice tip</p>
          <p className="mt-1 text-sm text-foreground">{homeTip}</p>
        </div>
      )}
    </div>
  );
}
