import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TemplatePicker } from "../template-picker";

const mockOnSelect = vi.fn();

describe("TemplatePicker", () => {
  it("renders the AAC board card", () => {
    render(<TemplatePicker onSelect={mockOnSelect} />);
    expect(screen.getByText("AAC Communication Board")).toBeInTheDocument();
  });

  it("calls onSelect with 'aac_board' when the card is clicked", () => {
    mockOnSelect.mockClear();
    render(<TemplatePicker onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByText("AAC Communication Board"));
    expect(mockOnSelect).toHaveBeenCalledWith("aac_board");
  });
});
