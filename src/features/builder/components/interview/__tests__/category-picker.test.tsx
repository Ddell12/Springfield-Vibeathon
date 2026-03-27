import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategoryPicker } from "../category-picker";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}));

describe("CategoryPicker", () => {
  it("renders top 5 category cards", () => {
    const { getByText } = render(<CategoryPicker onSelect={vi.fn()} onEscapeHatch={vi.fn()} />);
    expect(getByText("Communication Board")).toBeInTheDocument();
    expect(getByText("Visual Schedule")).toBeInTheDocument();
    expect(getByText("Token Board")).toBeInTheDocument();
    expect(getByText("Social Story")).toBeInTheDocument();
    expect(getByText("Feelings Check-In")).toBeInTheDocument();
  });

  it("does not show 'More options' categories by default", () => {
    const { queryByText } = render(<CategoryPicker onSelect={vi.fn()} onEscapeHatch={vi.fn()} />);
    expect(queryByText("Flashcards")).not.toBeInTheDocument();
  });

  it("shows expanded categories after clicking 'More options'", () => {
    const { getByText } = render(<CategoryPicker onSelect={vi.fn()} onEscapeHatch={vi.fn()} />);
    fireEvent.click(getByText(/More options/i));
    expect(getByText(/Flashcards/)).toBeInTheDocument();
    expect(getByText(/Timer/)).toBeInTheDocument();
  });

  it("calls onSelect when a card is clicked", () => {
    const onSelect = vi.fn();
    const { getByText } = render(<CategoryPicker onSelect={onSelect} onEscapeHatch={vi.fn()} />);
    fireEvent.click(getByText("Communication Board"));
    expect(onSelect).toHaveBeenCalledWith("communication-board");
  });

  it("renders escape hatch link", () => {
    const onEscapeHatch = vi.fn();
    const { getByText } = render(<CategoryPicker onSelect={vi.fn()} onEscapeHatch={onEscapeHatch} />);
    fireEvent.click(getByText(/describe what you want/i));
    expect(onEscapeHatch).toHaveBeenCalled();
  });
});
