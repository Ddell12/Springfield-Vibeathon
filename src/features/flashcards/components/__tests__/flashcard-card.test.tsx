import { render, screen, fireEvent } from "@testing-library/react";

import { FlashcardCard } from "../flashcard-card";

describe("FlashcardCard", () => {
  const baseProps = {
    label: "Cat",
    index: 0,
    total: 5,
  };

  it("renders the card label", () => {
    render(<FlashcardCard {...baseProps} />);
    expect(screen.getByText("Cat")).toBeInTheDocument();
  });

  it("shows image when imageUrl is provided", () => {
    render(<FlashcardCard {...baseProps} imageUrl="https://example.com/cat.png" />);
    const img = screen.getByAltText("Cat");
    expect(img).toHaveAttribute("src", "https://example.com/cat.png");
  });

  it("shows placeholder when no imageUrl", () => {
    render(<FlashcardCard {...baseProps} />);
    const img = screen.getByAltText("Cat");
    expect(img.getAttribute("src")).toContain("data:image/svg+xml");
    expect(img.getAttribute("src")).toContain("Generating");
  });

  it("shows audio button when audioUrl is provided", () => {
    render(<FlashcardCard {...baseProps} audioUrl="https://example.com/cat.mp3" />);
    expect(screen.getByLabelText('Listen to "Cat"')).toBeInTheDocument();
  });

  it("hides audio button when no audioUrl", () => {
    render(<FlashcardCard {...baseProps} />);
    expect(screen.queryByLabelText('Listen to "Cat"')).not.toBeInTheDocument();
  });

  it("renders the card position indicator", () => {
    render(<FlashcardCard {...baseProps} index={2} total={10} />);
    expect(screen.getByText("3 of 10")).toBeInTheDocument();
  });
});
