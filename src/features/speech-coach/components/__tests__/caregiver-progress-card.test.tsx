import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CaregiverProgressCard } from "../caregiver-progress-card";

const MOCK_PROGRESS = {
  summary: "Ace had a great session today practicing S sounds!",
  soundsAttempted: [
    { sound: "/s/", wordsAttempted: 8, approximateSuccessRate: "high" as const, notes: "Getting this sound at the start of words" },
  ],
  overallEngagement: "high" as const,
  recommendedNextFocus: ["/r/"],
  insights: {
    strengths: ["Strong imitation"],
    patterns: [],
    notableCueingPatterns: [],
    recommendedNextTargets: [],
    homePracticeNotes: ["Point to S things on walks"],
  },
};

describe("CaregiverProgressCard", () => {
  it("renders the parent-friendly summary", () => {
    render(<CaregiverProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Ace had a great session today practicing S sounds!")).toBeInTheDocument();
  });

  it("shows the words practiced list", () => {
    render(<CaregiverProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Sounds practiced today")).toBeInTheDocument();
    expect(screen.getByText("/s/")).toBeInTheDocument();
  });

  it("shows home practice tip from insights", () => {
    render(<CaregiverProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Point to S things on walks")).toBeInTheDocument();
  });

  it("does NOT render any scoreCard numbers", () => {
    render(<CaregiverProgressCard progress={{ ...MOCK_PROGRESS, scoreCards: { overall: 72, productionAccuracy: 68, consistency: 70, cueingSupport: 55, engagement: 80 } as any }} />);
    expect(screen.queryByText("72")).not.toBeInTheDocument();
    expect(screen.queryByText("Accuracy")).not.toBeInTheDocument();
  });

  it("does NOT render clinical terms", () => {
    render(<CaregiverProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.queryByText(/cueing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/phoneme/i)).not.toBeInTheDocument();
  });

  it("shows recommended next session sounds", () => {
    render(<CaregiverProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("/r/")).toBeInTheDocument();
  });
});
