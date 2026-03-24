import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThinkingState } from "../thinking-state";

describe("ThinkingState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with thinking status when not complete", () => {
    render(<ThinkingState status="Thinking..." isComplete={false} />);
    expect(screen.getByText(/Thinking\.\.\./)).toBeInTheDocument();
  });

  it("shows pulsing dot when not complete", () => {
    const { container } = render(<ThinkingState status="Thinking..." isComplete={false} />);
    // The pulsing dot has animate-pulse class
    const pulsingDot = container.querySelector(".animate-pulse");
    expect(pulsingDot).not.toBeNull();
  });

  it("does not show pulsing dot when complete", () => {
    const { container } = render(<ThinkingState status="Thinking..." isComplete={true} />);
    const pulsingDot = container.querySelector(".animate-pulse");
    expect(pulsingDot).toBeNull();
  });

  it("shows elapsed timer while thinking", () => {
    render(<ThinkingState status="Thinking..." isComplete={false} />);
    // Initially at 0s
    expect(screen.getByText(/0s/)).toBeInTheDocument();
  });

  it("increments timer every second", () => {
    render(<ThinkingState status="Thinking..." isComplete={false} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText(/3s/)).toBeInTheDocument();
  });

  it("shows 'Thought for Xs' when complete", () => {
    render(<ThinkingState status="Thinking..." isComplete={true} />);
    expect(screen.getByText(/Thought for/)).toBeInTheDocument();
  });

  it("stops incrementing timer when isComplete changes to true", () => {
    const { rerender } = render(<ThinkingState status="Thinking..." isComplete={false} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText(/5s/)).toBeInTheDocument();

    rerender(<ThinkingState status="Thinking..." isComplete={true} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should still show "Thought for 5s" — timer stopped at 5
    expect(screen.getByText(/5s/)).toBeInTheDocument();
  });

  it("renders plan content when provided", () => {
    render(
      <ThinkingState
        status="Thinking..."
        isComplete={false}
        plan="1. **Tool Type** — Token board"
      />
    );
    expect(screen.getByText("1. **Tool Type** — Token board")).toBeInTheDocument();
  });

  it("does not render plan section when plan is not provided", () => {
    const { container } = render(<ThinkingState status="Thinking..." isComplete={false} />);
    // No whitespace-pre-wrap div (plan content div)
    const planDiv = container.querySelector(".whitespace-pre-wrap");
    expect(planDiv).toBeNull();
  });

  it("renders Building status correctly", () => {
    render(<ThinkingState status="Building..." isComplete={false} />);
    expect(screen.getByText(/Building\.\.\./)).toBeInTheDocument();
  });

  it("shows the Lightbulb icon", () => {
    const { container } = render(<ThinkingState status="Thinking..." isComplete={false} />);
    // Lucide renders an SVG
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });
});
