import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TokenBoardEditor } from "../editor";
import type { TokenBoardConfig } from "../schema";

const mockOnChange = vi.fn();

const baseConfig: TokenBoardConfig = {
  title: "Token Board",
  tokenCount: 5,
  rewardLabel: "5 minutes of free choice",
  tokenShape: "star",
  tokenColor: "#FBBF24",
  highContrast: false,
};

describe("TokenBoardEditor", () => {
  it("renders title input with current value", () => {
    render(<TokenBoardEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue("Token Board")).toBeInTheDocument();
  });

  it("renders reward label input", () => {
    render(<TokenBoardEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue("5 minutes of free choice")).toBeInTheDocument();
  });

  it("calls onChange with updated title", () => {
    mockOnChange.mockClear();
    render(<TokenBoardEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.change(screen.getByDisplayValue("Token Board"), {
      target: { value: "Star Chart" },
    });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Star Chart" })
    );
  });

  it("calls onChange with updated rewardLabel", () => {
    mockOnChange.mockClear();
    render(<TokenBoardEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.change(screen.getByDisplayValue("5 minutes of free choice"), {
      target: { value: "10 minutes of play" },
    });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ rewardLabel: "10 minutes of play" })
    );
  });

  it("renders highContrast toggle", () => {
    render(<TokenBoardEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByLabelText(/high contrast/i)).toBeInTheDocument();
  });

  it("renders token count input", () => {
    render(<TokenBoardEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue("5")).toBeInTheDocument();
  });
});
