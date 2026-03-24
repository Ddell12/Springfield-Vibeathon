import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FileProgress } from "../file-progress";
import type { ProgressPhase } from "../file-progress";

// motion/react animations don't run in jsdom — stub them out
vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

const STEP_LABELS = [
  "Analyzing therapy requirements",
  "Naming your tool",
  "Planning the design",
  "Writing component code",
  "Building interactive elements",
  "Applying therapy-safe styling",
  "Finalizing accessibility",
];

describe("FileProgress", () => {
  it("renders all 7 step labels", () => {
    render(<FileProgress progressPhase="started" />);
    for (const label of STEP_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders the header text 'Let me build this:'", () => {
    render(<FileProgress progressPhase="started" />);
    expect(screen.getByText("Let me build this:")).toBeInTheDocument();
  });

  it("shows the first step as in-progress when phase is 'started'", () => {
    const { container } = render(<FileProgress progressPhase="started" />);
    // The spinning loader should be present
    const spinners = container.querySelectorAll(".animate-spin");
    expect(spinners.length).toBe(1);
  });

  it("marks earlier steps as completed and current step as in-progress for 'code-started'", () => {
    const { container } = render(<FileProgress progressPhase="code-started" />);
    // Steps before "code-started": started, title, description = 3 completed
    const completedTexts = container.querySelectorAll(".line-through");
    expect(completedTexts.length).toBe(3);
    // Exactly one spinner
    const spinners = container.querySelectorAll(".animate-spin");
    expect(spinners.length).toBe(1);
  });

  it("marks all steps as completed when progressPhase is 'complete'", () => {
    const { container } = render(<FileProgress progressPhase="complete" />);
    const completedTexts = container.querySelectorAll(".line-through");
    expect(completedTexts.length).toBe(7);
    // No spinner when complete
    const spinners = container.querySelectorAll(".animate-spin");
    expect(spinners.length).toBe(0);
  });

  it("shows 'Finalizing accessibility' as in-progress when phase is 'dependencies'", () => {
    render(<FileProgress progressPhase="dependencies" />);
    const lastStepText = screen.getByText("Finalizing accessibility");
    // It should have the in-progress font-medium class — its parent wrapper has no line-through
    expect(lastStepText).not.toHaveClass("line-through");
    expect(lastStepText).toHaveClass("font-medium");
  });

  it("shows all steps as pending when progressPhase is 'started' (only first is in-progress)", () => {
    const { container } = render(<FileProgress progressPhase="started" />);
    // 6 pending steps (all except the first)
    const pendingTexts = container.querySelectorAll(".text-muted");
    // text-muted is used for pending step labels AND their icons — count just the text spans
    // The text-sm.text-muted spans are the labels of pending steps
    const pendingLabels = Array.from(pendingTexts).filter(
      (el) => el.tagName === "SPAN" && el.classList.contains("text-sm")
    );
    expect(pendingLabels.length).toBe(6);
  });
});
