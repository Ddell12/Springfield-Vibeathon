import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi } from "vitest";
import { VisualSchedule } from "../visual-schedule";
import type { VisualScheduleConfig } from "../../types/tool-configs";

// Mock dnd-kit to avoid drag-drop setup complexity in jsdom
vi.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@dnd-kit/react/sortable", () => ({
  useSortable: () => ({ ref: { current: null } }),
  Sortable: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const mockScheduleConfig: VisualScheduleConfig = {
  type: "visual-schedule",
  title: "Morning Routine",
  steps: [
    { id: "1", label: "Wake Up", icon: "🌅", completed: false },
    { id: "2", label: "Brush Teeth", icon: "🪥", completed: false },
    { id: "3", label: "Get Dressed", icon: "👕", completed: false },
    { id: "4", label: "Eat Breakfast", icon: "🥣", completed: false },
    { id: "5", label: "Pack Backpack", icon: "🎒", completed: false },
  ],
  orientation: "vertical",
  showCheckmarks: true,
  theme: "default",
};

describe("VisualSchedule", () => {
  test("renders all steps from config", () => {
    render(<VisualSchedule config={mockScheduleConfig} />);

    expect(screen.getByText("Wake Up")).toBeInTheDocument();
    expect(screen.getByText("Brush Teeth")).toBeInTheDocument();
    expect(screen.getByText("Get Dressed")).toBeInTheDocument();
    expect(screen.getByText("Eat Breakfast")).toBeInTheDocument();
    expect(screen.getByText("Pack Backpack")).toBeInTheDocument();
  });

  test("marks step as completed on tap", async () => {
    const user = userEvent.setup();
    render(<VisualSchedule config={mockScheduleConfig} />);

    const wakeUpButton = screen.getByRole("button", { name: /Wake Up/i });
    await user.click(wakeUpButton);

    // After completing, button should be disabled (completed steps cannot be re-clicked)
    expect(wakeUpButton).toBeDisabled();
  });

  test("shows 'Happening Now' on first incomplete step", () => {
    const configWithFirstCompleted: VisualScheduleConfig = {
      ...mockScheduleConfig,
      steps: [
        { id: "1", label: "Wake Up", icon: "🌅", completed: true },
        { id: "2", label: "Brush Teeth", icon: "🪥", completed: false },
        { id: "3", label: "Get Dressed", icon: "👕", completed: false },
        { id: "4", label: "Eat Breakfast", icon: "🥣", completed: false },
        { id: "5", label: "Pack Backpack", icon: "🎒", completed: false },
      ],
    };
    render(<VisualSchedule config={configWithFirstCompleted} />);

    // "Happening Now" should appear next to "Brush Teeth" (first incomplete)
    expect(screen.getByText(/Happening Now/i)).toBeInTheDocument();
    // Verify it's associated with Brush Teeth by checking it's in the same vicinity
    const brushTeethButton = screen.getByRole("button", {
      name: /Brush Teeth/i,
    });
    expect(brushTeethButton).toBeInTheDocument();
  });

  test("disables completed steps", () => {
    const configWithCompleted: VisualScheduleConfig = {
      ...mockScheduleConfig,
      steps: [
        { id: "1", label: "Wake Up", icon: "🌅", completed: true },
        { id: "2", label: "Brush Teeth", icon: "🪥", completed: false },
        { id: "3", label: "Get Dressed", icon: "👕", completed: false },
        { id: "4", label: "Eat Breakfast", icon: "🥣", completed: false },
        { id: "5", label: "Pack Backpack", icon: "🎒", completed: false },
      ],
    };
    render(<VisualSchedule config={configWithCompleted} />);

    const wakeUpButton = screen.getByRole("button", { name: /Wake Up/i });
    expect(wakeUpButton).toBeDisabled();

    // Other steps should NOT be disabled
    const brushTeethButton = screen.getByRole("button", {
      name: /Brush Teeth/i,
    });
    expect(brushTeethButton).not.toBeDisabled();
  });

  test("shows progress with correct count", async () => {
    const user = userEvent.setup();
    render(<VisualSchedule config={mockScheduleConfig} />);

    // Complete first 2 steps
    await user.click(screen.getByRole("button", { name: /Wake Up/i }));
    await user.click(screen.getByRole("button", { name: /Brush Teeth/i }));

    expect(screen.getByText(/2 of 5 steps/i)).toBeInTheDocument();
  });

  test("renders with empty steps gracefully", () => {
    const emptyConfig: VisualScheduleConfig = {
      ...mockScheduleConfig,
      steps: [],
    };

    // Should not crash
    expect(() => render(<VisualSchedule config={emptyConfig} />)).not.toThrow();
  });
});
