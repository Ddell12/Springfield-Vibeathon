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
});
