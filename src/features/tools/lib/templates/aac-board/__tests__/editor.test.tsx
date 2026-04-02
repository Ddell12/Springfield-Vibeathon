import { fireEvent,render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AACBoardEditor } from "../editor";
import type { AACBoardConfig } from "../schema";

const mockOnChange = vi.fn();

const baseConfig: AACBoardConfig = {
  title: "Snack Board",
  gridCols: 3,
  gridRows: 2,
  buttons: [{ id: "1", label: "Crackers", speakText: "I want crackers" }],
  showTextLabels: true,
  autoSpeak: true,
  voice: "child-friendly",
  highContrast: false,
};

describe("AACBoardEditor", () => {
  it("renders the title input with current value", () => {
    render(<AACBoardEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue("Snack Board")).toBeInTheDocument();
  });

  it("calls onChange with updated title when title input changes", () => {
    mockOnChange.mockClear();
    render(<AACBoardEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.change(screen.getByDisplayValue("Snack Board"), {
      target: { value: "Drink Board" },
    });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Drink Board" })
    );
  });

  it("renders existing button label inputs", () => {
    render(<AACBoardEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue("Crackers")).toBeInTheDocument();
  });

  it("calls onChange with new button appended when Add button is clicked", () => {
    mockOnChange.mockClear();
    render(<AACBoardEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole("button", { name: /add button/i }));
    const call = mockOnChange.mock.calls[0][0] as AACBoardConfig;
    expect(call.buttons.length).toBe(2);
  });

  it("calls onChange with button removed when Remove is clicked", () => {
    mockOnChange.mockClear();
    render(<AACBoardEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    const call = mockOnChange.mock.calls[0][0] as AACBoardConfig;
    expect(call.buttons.length).toBe(0);
  });
});
