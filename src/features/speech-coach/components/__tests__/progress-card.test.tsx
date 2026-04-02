import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressCard } from "../progress-card";

const MOCK_PROGRESS = {
  summary: "Great session! Practiced /s/ sounds with strong results.",
  soundsAttempted: [
    { sound: "/s/", wordsAttempted: 8, approximateSuccessRate: "high" as const, notes: "Strong initial /s/" },
    { sound: "/r/", wordsAttempted: 4, approximateSuccessRate: "low" as const, notes: "Needs more practice" },
  ],
  overallEngagement: "high" as const,
  recommendedNextFocus: ["/r/", "/l/"],
};

describe("ProgressCard", () => {
  it("renders summary text", () => {
    render(<ProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Great session! Practiced /s/ sounds with strong results.")).toBeInTheDocument();
  });

  it("renders sounds attempted with word counts", () => {
    render(<ProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("/s/")).toBeInTheDocument();
    expect(screen.getByText("8 words")).toBeInTheDocument();
    expect(screen.getByText("4 words")).toBeInTheDocument();
  });

  it("renders recommended next focus", () => {
    render(<ProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Next time, try:")).toBeInTheDocument();
  });

  it("renders score cards, insight groups, and transcript turns", () => {
    render(
      <ProgressCard
        progress={{
          summary: "Needed cueing but stayed engaged.",
          soundsAttempted: [],
          overallEngagement: "medium",
          recommendedNextFocus: ["/s/"],
          scoreCards: {
            overall: 72,
            productionAccuracy: 68,
            consistency: 70,
            cueingSupport: 55,
            engagement: 80,
          },
          insights: {
            strengths: ["Strong imitation after a direct model"],
            patterns: ["Dropped final /d/ in sad"],
            notableCueingPatterns: ["Best after immediate repetition"],
            recommendedNextTargets: ["/s/"],
            homePracticeNotes: ["Practice sad, sun, sock with a visual card"],
          },
          transcriptTurns: [
            {
              speaker: "coach",
              text: "Say sad",
              targetLabel: "sad",
              attemptOutcome: "incorrect",
              retryCount: 0,
              timestampMs: 1000,
            },
          ],
        }}
      />
    );

    expect(screen.getByText("Overall")).toBeInTheDocument();
    expect(screen.getByText("Strong imitation after a direct model")).toBeInTheDocument();
    expect(screen.getByText("Say sad")).toBeInTheDocument();
  });
});
