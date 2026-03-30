import { render, screen } from "@testing-library/react";

import { createMockDeck } from "@/test/fixtures/flashcard-fixtures";
import { DeckList } from "../deck-list";
import type { Id } from "../../../../../convex/_generated/dataModel";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="material-icon">{icon}</span>,
}));

// Mock DeckCard to isolate DeckList logic
vi.mock("../deck-card", () => ({
  DeckCard: ({ title, onClick, onRename, onDelete }: any) => (
    <button data-testid={`deck-card-${title}`} onClick={onClick}>
      {title}
      {onRename && <button data-testid={`rename-${title}`} onClick={onRename}>Rename</button>}
      {onDelete && <button data-testid={`delete-${title}`} onClick={onDelete}>Delete</button>}
    </button>
  ),
}));

describe("DeckList", () => {
  const baseProps = {
    activeDeckId: null,
    onSelectDeck: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no decks", () => {
    mockUseQuery.mockReturnValue([]);
    render(<DeckList {...baseProps} />);
    expect(screen.getByText("No decks yet")).toBeInTheDocument();
    expect(screen.getByText("Use the chat to create flashcard decks")).toBeInTheDocument();
  });

  it("shows empty state when query returns undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<DeckList {...baseProps} />);
    expect(screen.getByText("No decks yet")).toBeInTheDocument();
  });

  it("renders deck cards for each deck", () => {
    const decks = [
      createMockDeck({ title: "Animals" }),
      createMockDeck({ _id: "flashcardDecks_2", title: "Colors" }),
    ];
    mockUseQuery.mockReturnValue(decks);
    render(<DeckList {...baseProps} />);

    expect(screen.getByText("Animals")).toBeInTheDocument();
    expect(screen.getByText("Colors")).toBeInTheDocument();
    expect(screen.getByText("Your Decks")).toBeInTheDocument();
    expect(screen.getByText("2 decks")).toBeInTheDocument();
  });

  it("shows singular 'deck' for single deck", () => {
    mockUseQuery.mockReturnValue([createMockDeck()]);
    render(<DeckList {...baseProps} />);
    expect(screen.getByText("1 deck")).toBeInTheDocument();
  });

  it("passes onRename callback to DeckCard", () => {
    const onRenameDeck = vi.fn();
    const deck = createMockDeck({ title: "Animals" });
    mockUseQuery.mockReturnValue([deck]);
    render(<DeckList {...baseProps} onRenameDeck={onRenameDeck} />);

    expect(screen.getByTestId("rename-Animals")).toBeInTheDocument();
  });

  it("passes onDelete callback to DeckCard", () => {
    const onDeleteDeck = vi.fn();
    const deck = createMockDeck({ title: "Animals" });
    mockUseQuery.mockReturnValue([deck]);
    render(<DeckList {...baseProps} onDeleteDeck={onDeleteDeck} />);

    expect(screen.getByTestId("delete-Animals")).toBeInTheDocument();
  });

  it("calls onSelectDeck when deck card clicked", () => {
    const onSelectDeck = vi.fn();
    const deck = createMockDeck({ title: "Animals" });
    mockUseQuery.mockReturnValue([deck]);
    render(<DeckList {...baseProps} onSelectDeck={onSelectDeck} />);

    screen.getByTestId("deck-card-Animals").click();
    expect(onSelectDeck).toHaveBeenCalledWith(deck._id);
  });
});
