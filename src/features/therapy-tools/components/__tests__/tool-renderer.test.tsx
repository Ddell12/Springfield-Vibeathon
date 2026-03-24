import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { ToolRenderer } from "../tool-renderer";

// Mock the tool components as simple divs that render the config title.
// This avoids async Suspense complexity and isolates the renderer's routing logic.
vi.mock("../visual-schedule", () => ({
  VisualSchedule: ({ config }: { config: { title: string } }) => (
    <div data-testid="visual-schedule">{config.title}</div>
  ),
}));

vi.mock("../token-board", () => ({
  TokenBoard: ({ config }: { config: { title: string } }) => (
    <div data-testid="token-board">{config.title}</div>
  ),
}));

vi.mock("../communication-board", () => ({
  CommunicationBoard: ({ config }: { config: { title: string } }) => (
    <div data-testid="communication-board">{config.title}</div>
  ),
}));

describe("ToolRenderer", () => {
  test("renders VisualSchedule for visual-schedule config", () => {
    render(
      <ToolRenderer
        config={{
          type: "visual-schedule",
          title: "Morning Routine",
          steps: [],
          orientation: "vertical",
          showCheckmarks: true,
          theme: "default",
        }}
      />,
    );

    expect(screen.getByTestId("visual-schedule")).toBeInTheDocument();
    expect(screen.getByText("Morning Routine")).toBeInTheDocument();
  });

  test("renders TokenBoard for token-board config", () => {
    render(
      <ToolRenderer
        config={{
          type: "token-board",
          title: "Star Rewards",
          totalTokens: 5,
          earnedTokens: 0,
          tokenIcon: "star",
          reinforcers: [],
          celebrationAnimation: true,
        }}
      />,
    );

    expect(screen.getByTestId("token-board")).toBeInTheDocument();
    expect(screen.getByText("Star Rewards")).toBeInTheDocument();
  });

  test("renders CommunicationBoard for communication-board config", () => {
    render(
      <ToolRenderer
        config={{
          type: "communication-board",
          title: "Snack Board",
          sentenceStarter: "I want",
          cards: [],
          enableTTS: true,
          voiceId: "default",
          columns: 3,
        }}
      />,
    );

    expect(screen.getByTestId("communication-board")).toBeInTheDocument();
    expect(screen.getByText("Snack Board")).toBeInTheDocument();
  });

  test("shows 'coming soon' for choice-board", () => {
    render(
      <ToolRenderer
        config={{
          type: "choice-board",
          title: "Activity Choices",
          prompt: "Pick one:",
          choices: [],
          maxSelections: 1,
          showConfirmButton: true,
        }}
      />,
    );

    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  test("shows 'coming soon' for first-then-board", () => {
    render(
      <ToolRenderer
        config={{
          type: "first-then-board",
          title: "First-Then",
          firstTask: { label: "Homework", icon: "📚", completed: false },
          thenReward: { label: "TV Time", icon: "📺" },
          showTimer: false,
          timerMinutes: 0,
        }}
      />,
    );

    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  test("shows error fallback for invalid config", () => {
    render(<ToolRenderer config={{ type: "invalid" }} />);

    expect(screen.getByText(/couldn't be displayed/i)).toBeInTheDocument();
  });

  test("shows error fallback for null config", () => {
    render(<ToolRenderer config={null} />);

    expect(screen.getByText(/couldn't be displayed/i)).toBeInTheDocument();
  });
});
