import { render, screen, fireEvent } from "@testing-library/react";

import { DeckCard } from "../deck-card";

describe("DeckCard", () => {
  const baseProps = {
    title: "Animal Sounds",
    cardCount: 5,
    isActive: false,
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders deck title and card count", () => {
    render(<DeckCard {...baseProps} />);
    expect(screen.getByText("Animal Sounds")).toBeInTheDocument();
    expect(screen.getByText("5 cards")).toBeInTheDocument();
  });

  it("renders singular 'card' when count is 1", () => {
    render(<DeckCard {...baseProps} cardCount={1} />);
    expect(screen.getByText("1 card")).toBeInTheDocument();
  });

  it("applies active styling when selected", () => {
    const { container } = render(<DeckCard {...baseProps} isActive={true} />);
    const button = container.querySelector("button");
    expect(button?.className).toContain("border-primary");
  });

  it("does not apply active styling when not selected", () => {
    const { container } = render(<DeckCard {...baseProps} isActive={false} />);
    const button = container.querySelector("button");
    expect(button?.className).not.toContain("border-primary");
  });

  it("fires onClick when clicked", () => {
    const onClick = vi.fn();
    render(<DeckCard {...baseProps} onClick={onClick} />);
    fireEvent.click(screen.getByText("Animal Sounds"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows dropdown trigger when rename and delete handlers provided", () => {
    const onRename = vi.fn();
    const onDelete = vi.fn();
    render(<DeckCard {...baseProps} onRename={onRename} onDelete={onDelete} />);

    const trigger = screen.getByLabelText("Deck options");
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  });

  it("does not show dropdown when no onRename or onDelete", () => {
    render(<DeckCard {...baseProps} />);
    expect(screen.queryByLabelText("Deck options")).not.toBeInTheDocument();
  });
});
