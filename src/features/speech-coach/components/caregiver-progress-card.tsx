import type { ScoreCards, TranscriptTurn } from "../lib/session-analysis";

// Accepts the same ProgressData shape as ProgressCard — renders only parent-appropriate fields.
// NEVER render scoreCards, transcript turns, or clinical insight labels in this component.
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
  scoreCards?: ScoreCards; // received but intentionally never rendered
  insights?: Insights;
  transcriptTurns?: TranscriptTurn[]; // received but intentionally never rendered
};

const ENGAGEMENT_EMOJI: Record<string, string> = {
  high: "🌟",
  medium: "👍",
  low: "💪",
};

export function CaregiverProgressCard({ progress }: { progress: ProgressData }) {
  const homePracticeTips = progress.insights?.homePracticeNotes ?? [];

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-muted/30 p-5">
      {/* Emoji + engagement */}
      <div className="flex items-center gap-2">
        <span className="text-3xl" aria-hidden="true">
          {ENGAGEMENT_EMOJI[progress.overallEngagement] ?? "👏"}
        </span>
        <p className="text-sm leading-relaxed text-foreground">{progress.summary}</p>
      </div>

      {/* Sounds practiced */}
      {progress.soundsAttempted.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="font-body text-sm font-semibold text-foreground">
            Sounds practiced today
          </h4>
          {progress.soundsAttempted.map((attempt) => (
            <div key={attempt.sound} className="flex items-start gap-3">
              <span className="font-mono text-sm font-bold text-foreground">
                {attempt.sound}
              </span>
              <span className="text-sm text-muted-foreground">{attempt.notes}</span>
            </div>
          ))}
        </div>
      )}

      {/* Home practice tips */}
      {homePracticeTips.length > 0 && (
        <div className="rounded-xl bg-primary/8 p-4">
          <h4 className="font-body text-sm font-semibold text-foreground">
            Practice at home this week
          </h4>
          <ul className="mt-2 flex flex-col gap-1.5">
            {homePracticeTips.map((tip) => (
              <li key={tip} className="flex gap-1.5 text-sm text-foreground">
                <span aria-hidden="true">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next session recommendation */}
      {progress.recommendedNextFocus.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground">
            Next time, the coach will focus on:
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {progress.recommendedNextFocus.map((sound) => (
              <span
                key={sound}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {sound}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
