import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FirstThenBoardEditor } from "../editor";
import type { FirstThenBoardConfig } from "../schema";

const mockOnChange = vi.fn();

const baseConfig: FirstThenBoardConfig = {
  title: "First / Then",
  firstLabel: "Clean up",
  thenLabel: "Free time",
  firstColor: "#3B82F6",
  thenColor: "#10B981",
  highContrast: false,
  showCheckmark: true,
};

describe("FirstThenBoardEditor", () => {
  it("renders title input with current value", () => {
    render(<FirstThenBoardEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue("First / Then")).toBeInTheDocument();
  });

  it("renders firstLabel and thenLabel inputs", () => {
    render(<FirstThenBoardEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue("Clean up")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Free time")).toBeInTheDocument();
  });

  it("calls onChange with updated title", () => {
    mockOnChange.mockClear();
    render(<FirstThenBoardEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.change(screen.getByDisplayValue("First / Then"), {
      target: { value: "My Board" },
    });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ title: "My Board" })
    );
  });

  it("calls onChange with updated firstLabel", () => {
    mockOnChange.mockClear();
    render(<FirstThenBoardEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.change(screen.getByDisplayValue("Clean up"), {
      target: { value: "Brush teeth" },
    });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ firstLabel: "Brush teeth" })
    );
  });

  it("calls onChange with updated thenLabel", () => {
    mockOnChange.mockClear();
    render(<FirstThenBoardEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.change(screen.getByDisplayValue("Free time"), {
      target: { value: "iPad time" },
    });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ thenLabel: "iPad time" })
    );
  });

  it("renders showCheckmark and highContrast toggles", () => {
    render(<FirstThenBoardEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByLabelText(/show checkmark/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/high contrast/i)).toBeInTheDocument();
  });
});
