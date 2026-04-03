import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SlpProgressCard } from "../slp-progress-card";

const MOCK_PROGRESS = {
  summary: "Student practiced /s/ sounds.",
  soundsAttempted: [
    { sound: "/s/", wordsAttempted: 11, approximateSuccessRate: "high" as const, notes: "Strong initial position" },
  ],
  overallEngagement: "high" as const,
  recommendedNextFocus: ["/s/ medial"],
  scoreCards: {
    overall: 78,
    productionAccuracy: 82,
    consistency: 75,
    cueingSupport: 60,
    engagement: 88,
  },
  cueDistribution: {
    spontaneous: 38,
    model: 35,
    phoneticCue: 19,
    directCorrection: 8,
  },
  positionAccuracy: [
    { sound: "/s/", position: "initial" as const, correct: 9, total: 11 },
    { sound: "/s/", position: "medial" as const, correct: 4, total: 9 },
  ],
  iepNoteDraft: "Student produced /s/ in initial position with 82% accuracy across 11 trials.",
};

describe("SlpProgressCard", () => {
  it("renders production accuracy score", () => {
    render(<SlpProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("renders position accuracy rows", () => {
    render(<SlpProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Initial")).toBeInTheDocument();
    expect(screen.getByText("9/11")).toBeInTheDocument();
  });

  it("renders cue distribution percentages", () => {
    render(<SlpProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Spontaneous")).toBeInTheDocument();
    expect(screen.getByText("38%")).toBeInTheDocument();
  });

  it("renders the IEP note draft", () => {
    render(<SlpProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText(/82% accuracy/)).toBeInTheDocument();
  });

  it("Copy note button copies iepNoteDraft to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<SlpProgressCard progress={MOCK_PROGRESS} />);
    fireEvent.click(screen.getByText("Copy note"));
    expect(writeText).toHaveBeenCalledWith(MOCK_PROGRESS.iepNoteDraft);
  });

  it("renders without positionAccuracy or cueDistribution gracefully", () => {
    render(
      <SlpProgressCard
        progress={{ ...MOCK_PROGRESS, positionAccuracy: undefined, cueDistribution: undefined }}
      />
    );
    expect(screen.getByText("82")).toBeInTheDocument(); // still shows scoreCards
  });
});
