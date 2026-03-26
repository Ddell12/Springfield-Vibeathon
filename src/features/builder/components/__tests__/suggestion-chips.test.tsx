// src/features/builder/components/__tests__/suggestion-chips.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SuggestionChips } from "@/shared/components/suggestion-chips";

describe("SuggestionChips", () => {
  it("renders suggestion buttons for each suggestion", () => {
    render(
      <SuggestionChips
        suggestions={["Token board", "Visual schedule"]}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("Token board")).toBeInTheDocument();
    expect(screen.getByText("Visual schedule")).toBeInTheDocument();
  });

  it("renders nothing when suggestions array is empty", () => {
    const { container } = render(
      <SuggestionChips suggestions={[]} onSelect={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onSelect with the suggestion text when a chip is clicked", () => {
    const onSelect = vi.fn();
    render(
      <SuggestionChips
        suggestions={["Token board with stars", "Communication board"]}
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByText("Token board with stars"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("Token board with stars");
  });

  it("calls onSelect with the correct suggestion when multiple chips exist", () => {
    const onSelect = vi.fn();
    render(
      <SuggestionChips
        suggestions={["First suggestion", "Second suggestion", "Third suggestion"]}
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByText("Second suggestion"));
    expect(onSelect).toHaveBeenCalledWith("Second suggestion");
  });

  it("renders each suggestion as a button", () => {
    render(
      <SuggestionChips
        suggestions={["Morning tasks", "Evening routine"]}
        onSelect={vi.fn()}
      />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });
});
