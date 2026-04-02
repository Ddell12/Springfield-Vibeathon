export type TranscriptTurn = {
  speaker: "coach" | "child" | "system";
  text: string;
  targetItemId?: string;
  targetLabel?: string;
  targetVisualUrl?: string;
  attemptOutcome?: "correct" | "approximate" | "incorrect" | "no_response";
  retryCount: number;
  timestampMs: number;
};

export type ScoreCards = {
  overall: number;
  productionAccuracy: number;
  consistency: number;
  cueingSupport: number;
  engagement: number;
};

export function getSessionStatusLabel(status: string): string {
  return (
    {
      configuring: "Setting up",
      active: "In progress",
      transcript_ready: "Transcript saved",
      analyzing: "Reviewing",
      analyzed: "Complete",
      review_failed: "Review failed",
      failed: "Failed",
      completed: "Complete",
    }[status] ?? "Unknown"
  );
}
