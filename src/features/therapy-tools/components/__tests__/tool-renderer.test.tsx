import { render, screen } from "@testing-library/react";
import { ToolRenderer } from "../tool-renderer";
import { describe, test, expect } from "vitest";

describe("ToolRenderer", () => {
  test("renders placeholder for visual-schedule config", () => {
    render(<ToolRenderer config={{
      type: "visual-schedule",
      title: "Morning Routine",
      steps: [],
      orientation: "vertical",
      showCheckmarks: true,
      theme: "default"
    }} />);
    expect(screen.getByText(/Visual Schedule: Morning Routine/)).toBeInTheDocument();
  });

  test("renders placeholder for token-board config", () => {
    render(<ToolRenderer config={{
      type: "token-board",
      title: "Star Rewards",
      totalTokens: 5,
      earnedTokens: 0,
      tokenIcon: "star",
      reinforcers: [],
      celebrationAnimation: true
    }} />);
    expect(screen.getByText(/Token Board: Star Rewards/)).toBeInTheDocument();
  });

  test("renders placeholder for communication-board config", () => {
    render(<ToolRenderer config={{
      type: "communication-board",
      title: "Snack Board",
      sentenceStarter: "I want",
      cards: [],
      enableTTS: true,
      voiceId: "default",
      columns: 3
    }} />);
    expect(screen.getByText(/Communication Board: Snack Board/)).toBeInTheDocument();
  });

  test("shows error message for invalid config", () => {
    render(<ToolRenderer config={{ type: "invalid" }} />);
    expect(screen.getByText(/couldn't be displayed/)).toBeInTheDocument();
  });

  test("shows error message for null config", () => {
    render(<ToolRenderer config={null} />);
    expect(screen.getByText(/couldn't be displayed/)).toBeInTheDocument();
  });
});
