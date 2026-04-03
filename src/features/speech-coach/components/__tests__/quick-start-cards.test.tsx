import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuickStartCards } from "../quick-start-cards";

describe("QuickStartCards", () => {
  it("renders all 4 system template cards", () => {
    render(<QuickStartCards onSelect={vi.fn()} />);

    expect(screen.getByText("Sound Drill")).toBeInTheDocument();
    expect(screen.getByText("Conversational")).toBeInTheDocument();
    expect(screen.getByText("Listening First")).toBeInTheDocument();
    expect(screen.getByText("Mixed Practice")).toBeInTheDocument();
  });

  it("calls onSelect with the template id when a card is clicked", () => {
    const onSelect = vi.fn();
    render(<QuickStartCards onSelect={onSelect} />);

    fireEvent.click(screen.getByText("Sound Drill"));

    expect(onSelect).toHaveBeenCalledWith("sound-drill");
  });

  it("shows a description for each card", () => {
    render(<QuickStartCards onSelect={vi.fn()} />);

    expect(screen.getByText(/Structured repetition/)).toBeInTheDocument();
  });
});
