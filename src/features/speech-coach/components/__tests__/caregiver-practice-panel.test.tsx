import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CaregiverPracticePanel } from "../caregiver-practice-panel";

const MOCK_LATEST_PROGRESS = {
  summary: "Ace had a great session!",
  recommendedNextFocus: ["/s/"],
  insights: { homePracticeNotes: ["Try naming S words on walks"], strengths: [], patterns: [], notableCueingPatterns: [], recommendedNextTargets: [] },
  soundsAttempted: [],
  overallEngagement: "high" as const,
  analyzedAt: Date.now() - 86400000,
};

describe("CaregiverPracticePanel", () => {
  it("shows sessions this week count", () => {
    render(
      <CaregiverPracticePanel
        sessionsThisWeek={3}
        lastProgress={MOCK_LATEST_PROGRESS}
        onStartSession={vi.fn()}
      />
    );
    expect(screen.getByText("3 sessions this week")).toBeInTheDocument();
  });

  it("shows home practice tip", () => {
    render(
      <CaregiverPracticePanel
        sessionsThisWeek={1}
        lastProgress={MOCK_LATEST_PROGRESS}
        onStartSession={vi.fn()}
      />
    );
    expect(screen.getByText("Try naming S words on walks")).toBeInTheDocument();
  });

  it("Start session button calls onStartSession", () => {
    const onStart = vi.fn();
    render(
      <CaregiverPracticePanel
        sessionsThisWeek={1}
        lastProgress={MOCK_LATEST_PROGRESS}
        onStartSession={onStart}
      />
    );
    screen.getByText("Start a session").click();
    expect(onStart).toHaveBeenCalledOnce();
  });
});
