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
const mockVoice = { speak: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), status: "idle" as const };

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
      <AACBoardRuntime config={mockConfig} mode="preview" onEvent={mockOnEvent} voice={mockVoice} />
    );
    expect(screen.getByText("Crackers")).toBeInTheDocument();
    expect(screen.getByText("Drink")).toBeInTheDocument();
  });

  it("fires item_tapped event when a button is pressed", () => {
    mockOnEvent.mockClear();
    render(
      <AACBoardRuntime config={mockConfig} mode="preview" onEvent={mockOnEvent} voice={mockVoice} />
    );
    fireEvent.click(screen.getByText("Crackers"));
    expect(mockOnEvent).toHaveBeenCalledWith("item_tapped", expect.any(String));
  });

  it("hides labels when showTextLabels is false", () => {
    render(
      <AACBoardRuntime
        config={{ ...mockConfig, showTextLabels: false }}
        mode="preview"
        onEvent={mockOnEvent}
        voice={mockVoice}
      />
    );
    expect(screen.queryByText("Crackers")).not.toBeInTheDocument();
  });

  it("applies high-contrast class when highContrast is true", () => {
    const { container } = render(
      <AACBoardRuntime
        config={{ ...mockConfig, highContrast: true }}
        mode="preview"
        onEvent={mockOnEvent}
        voice={mockVoice}
      />
    );
    expect(container.firstChild).toHaveClass("high-contrast");
  });
});

const voice = { speak: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), status: "idle" as const };
const onEvent = vi.fn();

const base: AACBoardConfig = {
  title: "Test Board", gridCols: 3, gridRows: 2,
  buttons: [{ id: "1", label: "Go", speakText: "Go", wordCategory: "verb" as const }],
  showTextLabels: true, autoSpeak: true, sentenceStripEnabled: false,
  voice: "child-friendly", highContrast: false,
};

describe("AACBoardRuntime — Fitzgerald colors", () => {
  it("applies green background to verb buttons", () => {
    render(<AACBoardRuntime config={base} mode="preview" onEvent={onEvent} voice={voice} />);
    const btn = screen.getByRole("button", { name: /go/i });
    expect(btn).toHaveStyle("background-color: rgb(34, 197, 94)");
  });

  it("buttons without wordCategory have no Fitzgerald background", () => {
    const config = { ...base, buttons: [{ id: "1", label: "Test", speakText: "Test" }] };
    render(<AACBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    expect(screen.getByRole("button", { name: /test/i })).not.toHaveStyle("background-color: rgb(34, 197, 94)");
  });
});

describe("AACBoardRuntime — motor planning", () => {
  it("fills grid to gridCols × gridRows with empty placeholder slots", () => {
    // 3 cols × 2 rows = 6 slots, 1 button → 5 empty
    render(<AACBoardRuntime config={base} mode="preview" onEvent={onEvent} voice={voice} />);
    expect(document.querySelectorAll("[data-slot-empty]").length).toBe(5);
  });
});

describe("AACBoardRuntime — sentence strip", () => {
  it("shows strip when sentenceStripEnabled", () => {
    const config = { ...base, sentenceStripEnabled: true, autoSpeak: false };
    render(<AACBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    expect(screen.getByText(/tap buttons to build/i)).toBeInTheDocument();
  });

  it("tapping button appends to strip", () => {
    const config = { ...base, sentenceStripEnabled: true, autoSpeak: false };
    render(<AACBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    fireEvent.click(screen.getByRole("button", { name: /go/i }));
    expect(screen.getByRole("button", { name: /^speak$/i })).toBeInTheDocument();
  });
});
