import { fireEvent,render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VisualScheduleEditor } from "../editor";
import type { VisualScheduleConfig } from "../schema";

const mockOnChange = vi.fn();

const baseConfig: VisualScheduleConfig = {
  title: "Morning Routine",
  items: [
    { id: "1", label: "Wake up", durationMinutes: 5 },
    { id: "2", label: "Get dressed", durationMinutes: 10 },
  ],
  showDuration: true,
  highContrast: false,
  showCheckmarks: true,
};

describe("VisualScheduleEditor", () => {
  it("renders title input with current value", () => {
    render(<VisualScheduleEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue("Morning Routine")).toBeInTheDocument();
  });

  it("renders item label inputs", () => {
    render(<VisualScheduleEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue("Wake up")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Get dressed")).toBeInTheDocument();
  });

  it("calls onChange with updated title", () => {
    mockOnChange.mockClear();
    render(<VisualScheduleEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.change(screen.getByDisplayValue("Morning Routine"), {
      target: { value: "Evening Routine" },
    });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Evening Routine" })
    );
  });

  it("calls onChange with new item appended when Add item is clicked", () => {
    mockOnChange.mockClear();
    render(<VisualScheduleEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole("button", { name: /add item/i }));
    const call = mockOnChange.mock.calls[0][0] as VisualScheduleConfig;
    expect(call.items.length).toBe(3);
  });

  it("calls onChange with item removed when Remove is clicked", () => {
    mockOnChange.mockClear();
    render(<VisualScheduleEditor config={baseConfig} onChange={mockOnChange} />);
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]);
    const call = mockOnChange.mock.calls[0][0] as VisualScheduleConfig;
    expect(call.items.length).toBe(1);
  });

  it("renders showCheckmarks and highContrast toggles", () => {
    render(<VisualScheduleEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByLabelText(/show checkmarks/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/high contrast/i)).toBeInTheDocument();
  });
});
