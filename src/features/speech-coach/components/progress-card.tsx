import { cn } from "@/core/utils";

import type { ScoreCards, TranscriptTurn } from "../lib/session-analysis";

type SoundAttempt = {
  sound: string;
  wordsAttempted: number;
  approximateSuccessRate: "high" | "medium" | "low";
  notes: string;
};

type Insights = {
  strengths: string[];
  patterns: string[];
  notableCueingPatterns: string[];
  recommendedNextTargets: string[];
  homePracticeNotes: string[];
};

type ProgressData = {
  summary: string;
  soundsAttempted: SoundAttempt[];
  overallEngagement: "high" | "medium" | "low";
  recommendedNextFocus: string[];
  scoreCards?: ScoreCards;
  insights?: Insights;
  transcriptTurns?: TranscriptTurn[];
};

const RATE_STYLES = {
  high: "bg-success-container text-on-success-container",
  medium: "bg-caution-container text-on-caution-container",
  low: "bg-error-container text-on-error-container",
};

const ENGAGEMENT_LABELS = {
  high: "Very engaged",
  medium: "Somewhat engaged",
  low: "Needs encouragement",
};

export function ProgressCard({ progress }: { progress: ProgressData }) {
  return (
    <div className="flex flex-col gap-5 rounded-xl bg-muted/30 p-5">
      <p className="text-sm leading-relaxed text-foreground">{progress.summary}</p>

      <div className="flex flex-col gap-2">
        <h4 className="font-body text-sm font-semibold text-foreground">Sounds Practiced</h4>
        {progress.soundsAttempted.map((attempt) => (
          <div key={attempt.sound} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-foreground">{attempt.sound}</span>
              <span className="text-xs text-muted-foreground">{attempt.wordsAttempted} words</span>
            </div>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", RATE_STYLES[attempt.approximateSuccessRate])}>
              {attempt.approximateSuccessRate}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Engagement:</span>
        <span className="text-xs font-medium text-foreground">
          {ENGAGEMENT_LABELS[progress.overallEngagement]}
        </span>
      </div>

      {progress.recommendedNextFocus.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground">Next time, try:</span>
          <div className="mt-1 flex gap-1.5">
            {progress.recommendedNextFocus.map((sound) => (
              <span key={sound} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {sound}
              </span>
            ))}
          </div>
        </div>
      )}

      {progress.scoreCards && (
        <div className="flex flex-col gap-2">
          <h4 className="font-body text-sm font-semibold text-foreground">Session Scores</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(
              [
                ["Overall", progress.scoreCards.overall],
                ["Accuracy", progress.scoreCards.productionAccuracy],
                ["Consistency", progress.scoreCards.consistency],
                ["Cueing", progress.scoreCards.cueingSupport],
                ["Engagement", progress.scoreCards.engagement],
              ] as [string, number][]
            ).map(([label, value]) => (
              <div key={label} className="rounded-xl bg-background p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {progress.insights && (
        <div className="flex flex-col gap-3">
          {progress.insights.strengths.length > 0 && (
            <InsightSection label="Strengths" items={progress.insights.strengths} />
          )}
          {progress.insights.patterns.length > 0 && (
            <InsightSection label="Patterns noticed" items={progress.insights.patterns} />
          )}
          {progress.insights.notableCueingPatterns.length > 0 && (
            <InsightSection label="Cueing patterns" items={progress.insights.notableCueingPatterns} />
          )}
          {progress.insights.homePracticeNotes.length > 0 && (
            <InsightSection label="Home practice" items={progress.insights.homePracticeNotes} />
          )}
        </div>
      )}

      {progress.transcriptTurns && progress.transcriptTurns.length > 0 && (
        <section className="flex flex-col gap-2">
          <h4 className="font-body text-sm font-semibold text-foreground">Transcript</h4>
          {progress.transcriptTurns.map((turn, index) => (
            <div key={`${turn.speaker}-${index}`} className="rounded-lg bg-background/80 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {turn.speaker}
                </span>
                {turn.attemptOutcome ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      turn.attemptOutcome === "correct" && "bg-success-container text-on-success-container",
                      turn.attemptOutcome === "approximate" && "bg-caution-container text-on-caution-container",
                      turn.attemptOutcome === "incorrect" && "bg-error-container text-on-error-container",
                      turn.attemptOutcome === "no_response" && "bg-muted text-muted-foreground"
                    )}
                  >
                    {turn.attemptOutcome}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-foreground">{turn.text}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function InsightSection({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <ul className="mt-1 flex flex-col gap-1">
        {items.map((item) => (
          <li key={item} className="text-sm text-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
