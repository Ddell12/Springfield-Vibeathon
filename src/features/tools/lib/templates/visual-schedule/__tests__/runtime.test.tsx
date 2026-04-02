import { fireEvent,render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));
vi.mock("@convex/_generated/api", () => ({ api: { tools: { logEvent: "tools:logEvent" } } }));

import { VisualScheduleRuntime } from "../runtime";
import type { VisualScheduleConfig } from "../schema";

const mockOnEvent = vi.fn();

const mockConfig: VisualScheduleConfig = {
  title: "Morning Routine",
  items: [
    { id: "1", label: "Wake up", durationMinutes: 5 },
    { id: "2", label: "Get dressed", durationMinutes: 10 },
    { id: "3", label: "Eat breakfast", durationMinutes: 15 },
  ],
  showDuration: true,
  highContrast: false,
  showCheckmarks: true,
};

describe("VisualScheduleRuntime", () => {
  it("renders the title", () => {
    render(
      <VisualScheduleRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    expect(screen.getByText("Morning Routine")).toBeInTheDocument();
  });

  it("renders all schedule items", () => {
    render(
      <VisualScheduleRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    expect(screen.getByText("Wake up")).toBeInTheDocument();
    expect(screen.getByText("Get dressed")).toBeInTheDocument();
    expect(screen.getByText("Eat breakfast")).toBeInTheDocument();
  });

  it("logs item_tapped when current item is tapped", () => {
    mockOnEvent.mockClear();
    render(
      <VisualScheduleRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    fireEvent.click(screen.getByText("Wake up"));
    expect(mockOnEvent).toHaveBeenCalledWith("item_tapped", expect.stringContaining("Wake up"));
  });

  it("advances to next item after tapping current item", () => {
    render(
      <VisualScheduleRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    fireEvent.click(screen.getByText("Wake up"));
    // After tapping Wake up, Get dressed should be the active item
    const activeItem = screen.getByText("Get dressed").closest("[data-active]");
    expect(activeItem).toBeInTheDocument();
  });

  it("logs activity_completed when all items are done", () => {
    mockOnEvent.mockClear();
    render(
      <VisualScheduleRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    fireEvent.click(screen.getByText("Wake up"));
    fireEvent.click(screen.getByText("Get dressed"));
    fireEvent.click(screen.getByText("Eat breakfast"));
    expect(mockOnEvent).toHaveBeenCalledWith("activity_completed", expect.any(String));
  });

  it("shows duration when showDuration is true", () => {
    render(
      <VisualScheduleRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    const durationElements = screen.getAllByText(/\d+ min/);
    expect(durationElements.length).toBeGreaterThan(0);
  });
});
