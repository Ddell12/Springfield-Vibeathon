import { cn } from "@/core/utils";

type SoundAttempt = {
  sound: string;
  wordsAttempted: number;
  approximateSuccessRate: "high" | "medium" | "low";
  notes: string;
};

type ProgressData = {
  summary: string;
  soundsAttempted: SoundAttempt[];
  overallEngagement: "high" | "medium" | "low";
  recommendedNextFocus: string[];
};

const RATE_STYLES = {
  high: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
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
        <h4 className="font-manrope text-sm font-semibold text-foreground">Sounds Practiced</h4>
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
    </div>
  );
}
