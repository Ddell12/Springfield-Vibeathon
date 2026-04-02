import { fireEvent,render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock Convex useMutation — runtime calls logEvent but tests verify UI only
vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));
vi.mock("@convex/_generated/api", () => ({ api: { tools: { logEvent: "tools:logEvent" } } }));

import { AACBoardRuntime } from "../runtime";
import type { AACBoardConfig } from "../schema";

const mockOnEvent = vi.fn();

const mockConfig: AACBoardConfig = {
  title: "Snack Board",
  gridCols: 3,
  gridRows: 2,
  buttons: [
    { id: "1", label: "Crackers", speakText: "I want crackers" },
    { id: "2", label: "Drink", speakText: "I want a drink" },
  ],
  showTextLabels: true,
  autoSpeak: false, // disable in tests — avoids speechSynthesis calls
  voice: "child-friendly",
  highContrast: false,
};

describe("AACBoardRuntime", () => {
  it("renders all button labels", () => {
    render(
      <AACBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    expect(screen.getByText("Crackers")).toBeInTheDocument();
    expect(screen.getByText("Drink")).toBeInTheDocument();
  });

  it("fires item_tapped event when a button is pressed", () => {
    mockOnEvent.mockClear();
    render(
      <AACBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    fireEvent.click(screen.getByText("Crackers"));
    expect(mockOnEvent).toHaveBeenCalledWith("item_tapped", expect.any(String));
  });

  it("hides labels when showTextLabels is false", () => {
    render(
      <AACBoardRuntime
        config={{ ...mockConfig, showTextLabels: false }}
        shareToken="tok"
        onEvent={mockOnEvent}
      />
    );
    expect(screen.queryByText("Crackers")).not.toBeInTheDocument();
  });

  it("applies high-contrast class when highContrast is true", () => {
    const { container } = render(
      <AACBoardRuntime
        config={{ ...mockConfig, highContrast: true }}
        shareToken="tok"
        onEvent={mockOnEvent}
      />
    );
    expect(container.firstChild).toHaveClass("high-contrast");
  });
});
