import { fireEvent,render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));
vi.mock("@convex/_generated/api", () => ({ api: { tools: { logEvent: "tools:logEvent" } } }));

import { FirstThenBoardRuntime } from "../runtime";
import type { FirstThenBoardConfig } from "../schema";

const mockOnEvent = vi.fn();

const mockConfig: FirstThenBoardConfig = {
  title: "First / Then",
  firstLabel: "Clean up",
  thenLabel: "Free time",
  firstColor: "#3B82F6",
  thenColor: "#10B981",
  highContrast: false,
  showCheckmark: true,
};

describe("FirstThenBoardRuntime", () => {
  it("renders the title", () => {
    render(
      <FirstThenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    expect(screen.getByText("First / Then")).toBeInTheDocument();
  });

  it("renders FIRST and THEN labels", () => {
    render(
      <FirstThenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    expect(screen.getByText("Clean up")).toBeInTheDocument();
    expect(screen.getByText("Free time")).toBeInTheDocument();
  });

  it("logs item_tapped when FIRST card is tapped", () => {
    mockOnEvent.mockClear();
    render(
      <FirstThenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    fireEvent.click(screen.getByText("Clean up"));
    expect(mockOnEvent).toHaveBeenCalledWith("item_tapped", expect.stringContaining("first"));
  });

  it("logs activity_completed when THEN card is tapped after FIRST is done", () => {
    mockOnEvent.mockClear();
    render(
      <FirstThenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    // First tap the FIRST card to mark it done
    fireEvent.click(screen.getByText("Clean up"));
    // Then tap the THEN card
    fireEvent.click(screen.getByText("Free time"));
    expect(mockOnEvent).toHaveBeenCalledWith("activity_completed", expect.any(String));
  });

  it("applies high-contrast class when highContrast is true", () => {
    const { container } = render(
      <FirstThenBoardRuntime
        config={{ ...mockConfig, highContrast: true }}
        shareToken="tok"
        onEvent={mockOnEvent}
      />
    );
    expect(container.firstChild).toHaveClass("high-contrast");
  });

  it("shows reset button", () => {
    render(
      <FirstThenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
  });
});
