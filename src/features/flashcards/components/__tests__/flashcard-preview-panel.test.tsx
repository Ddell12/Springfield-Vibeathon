import { render, screen } from "@testing-library/react";

import { createMockDeck, createMockCard } from "@/test/fixtures/flashcard-fixtures";
import { FlashcardPreviewPanel } from "../flashcard-preview-panel";
import type { Id } from "../../../../../convex/_generated/dataModel";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon, className }: { icon: string; className?: string }) => (
    <span data-testid="material-icon" data-icon={icon} className={className}>{icon}</span>
  ),
}));

// Mock FlashcardSwiper to isolate preview panel logic
vi.mock("../flashcard-swiper", () => ({
  FlashcardSwiper: ({ cards }: { cards: any[] }) => (
    <div data-testid="flashcard-swiper">{cards.length} cards</div>
  ),
}));

describe("FlashcardPreviewPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows select deck prompt when no activeDeckId", () => {
    render(<FlashcardPreviewPanel activeDeckId={null} />);
    expect(screen.getByText("Select a deck or create new flashcards")).toBeInTheDocument();
  });

  it("shows Browse decks button when onOpenDeckSheet provided and no deck selected", () => {
    const onOpenDeckSheet = vi.fn();
    render(<FlashcardPreviewPanel activeDeckId={null} onOpenDeckSheet={onOpenDeckSheet} />);
    expect(screen.getByText("Browse decks")).toBeInTheDocument();
  });

  it("shows generating state when status is generating and no cards", () => {
    const deckId = "flashcardDecks_1" as Id<"flashcardDecks">;
    mockUseQuery.mockReturnValue(undefined);
    // First call returns deck (undefined), second returns cards (undefined treated as empty)
    let callCount = 0;
    mockUseQuery.mockImplementation(() => {
      callCount++;
      // Both deck and cards queries return null/empty during generation
      return callCount <= 1 ? null : [];
    });

    render(<FlashcardPreviewPanel activeDeckId={deckId} status="generating" />);
    expect(screen.getByText("Creating your flashcards...")).toBeInTheDocument();
  });

  it("shows empty cards state when no cards and not generating", () => {
    const deckId = "flashcardDecks_1" as Id<"flashcardDecks">;
    mockUseQuery.mockReturnValue(null);
    let callCount = 0;
    mockUseQuery.mockImplementation(() => {
      callCount++;
      return callCount <= 1 ? null : [];
    });

    render(<FlashcardPreviewPanel activeDeckId={deckId} status="idle" />);
    expect(screen.getByText("No cards yet. Try a different prompt.")).toBeInTheDocument();
  });

  it("renders swiper with cards when cards exist", () => {
    const deckId = "flashcardDecks_1" as Id<"flashcardDecks">;
    const deck = createMockDeck();
    const cards = [
      createMockCard({ label: "Cat" }),
      createMockCard({ _id: "flashcards_2", label: "Dog", sortOrder: 1 }),
    ];

    mockUseQuery.mockImplementation((_api: unknown, args: unknown) => {
      if (args && typeof args === "object" && "deckId" in args) {
        // Distinguish between deck get and cards list by checking if it's the first or second call
        // Both receive deckId, so we check the API ref
        return null; // Will be overridden below
      }
      return null;
    });

    // More precise: first call is deck.get, second is cards.listByDeck
    let callCount = 0;
    mockUseQuery.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? deck : cards;
    });

    render(<FlashcardPreviewPanel activeDeckId={deckId} />);
    expect(screen.getByTestId("flashcard-swiper")).toBeInTheDocument();
    expect(screen.getByText("2 cards")).toBeInTheDocument();
    expect(screen.getByText(deck.title)).toBeInTheDocument();
  });

  it("shows card count in header", () => {
    const deckId = "flashcardDecks_1" as Id<"flashcardDecks">;
    const deck = createMockDeck({ title: "My Deck" });
    const cards = [createMockCard()];

    let callCount = 0;
    mockUseQuery.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? deck : cards;
    });

    render(<FlashcardPreviewPanel activeDeckId={deckId} />);
    expect(screen.getByText("(1 card)")).toBeInTheDocument();
  });
});
