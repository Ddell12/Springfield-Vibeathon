import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MatchingGameEditor } from "../editor";
import type { MatchingGameConfig } from "../schema";

const mockOnChange = vi.fn();

const baseConfig: MatchingGameConfig = {
  title: "Animal Sounds",
  pairs: [
    { id: "1", prompt: "Dog", answer: "Woof" },
    { id: "2", prompt: "Cat", answer: "Meow" },
  ],
  showAnswerImages: false,
  celebrateCorrect: true,
  highContrast: false,
};

describe("MatchingGameEditor", () => {
  it("renders title input with current value", () => {
    render(<MatchingGameEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue("Animal Sounds")).toBeInTheDocument();
  });

  it("renders prompt and answer inputs for each pair", () => {
    render(<MatchingGameEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue("Dog")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Woof")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Meow")).toBeInTheDocument();
  });

  it("calls onChange with updated title", () => {
    mockOnChange.mockClear();
    render(<MatchingGameEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.change(screen.getByDisplayValue("Animal Sounds"), {
      target: { value: "Colors" },
    });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Colors" })
    );
  });

  it("calls onChange with new pair appended when Add pair is clicked", () => {
    mockOnChange.mockClear();
    render(<MatchingGameEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole("button", { name: /add pair/i }));
    const call = mockOnChange.mock.calls[0][0] as MatchingGameConfig;
    expect(call.pairs.length).toBe(3);
  });

  it("calls onChange with pair removed when Remove is clicked", () => {
    mockOnChange.mockClear();
    render(<MatchingGameEditor config={baseConfig} onChange={mockOnChange} />);
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]);
    const call = mockOnChange.mock.calls[0][0] as MatchingGameConfig;
    expect(call.pairs.length).toBe(1);
  });

  it("renders celebrateCorrect and highContrast toggles", () => {
    render(<MatchingGameEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByLabelText(/celebrate correct/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/high contrast/i)).toBeInTheDocument();
  });

  it("calls onChange with updated showAnswerImages when toggle is clicked", () => {
    mockOnChange.mockClear();
    render(<MatchingGameEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.click(screen.getByLabelText(/show answer images/i));
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ showAnswerImages: true })
    );
  });
});
