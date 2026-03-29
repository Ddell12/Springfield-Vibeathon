import { render, screen } from "@testing-library/react";

import { FlashcardSwiper } from "../flashcard-swiper";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="material-icon">{icon}</span>,
}));

// Mock FlashcardCard to isolate swiper logic
// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

vi.mock("../flashcard-card", () => ({
  FlashcardCard: ({ label, index, total }: any) => (
    <div data-testid={`card-${label}`}>
      {label} ({index + 1}/{total})
    </div>
  ),
}));

// Mock useDeckNavigation
const mockGoTo = vi.fn();
vi.mock("../../hooks/use-deck-navigation", () => ({
  useDeckNavigation: () => ({
    currentIndex: 0,
    goTo: mockGoTo,
  }),
}));

describe("FlashcardSwiper", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const cards = [
    { _id: "1", label: "Cat", sortOrder: 0 },
    { _id: "2", label: "Dog", sortOrder: 1 },
    { _id: "3", label: "Bird", sortOrder: 2 },
  ];

  it("shows empty state for empty cards array", () => {
    render(<FlashcardSwiper cards={[]} />);
    expect(screen.getByText(/no cards yet/i)).toBeInTheDocument();
  });

  it("renders cards", () => {
    render(<FlashcardSwiper cards={cards} />);
    expect(screen.getByTestId("card-Cat")).toBeInTheDocument();
    expect(screen.getByTestId("card-Dog")).toBeInTheDocument();
    expect(screen.getByTestId("card-Bird")).toBeInTheDocument();
  });

  it("shows navigation dots for each card", () => {
    render(<FlashcardSwiper cards={cards} />);
    const dots = screen.getAllByLabelText(/Go to card/);
    expect(dots).toHaveLength(3);
    expect(screen.getByLabelText("Go to card 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Go to card 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Go to card 3")).toBeInTheDocument();
  });

  it("shows prev/next buttons", () => {
    render(<FlashcardSwiper cards={cards} />);
    expect(screen.getByLabelText("Previous card")).toBeInTheDocument();
    expect(screen.getByLabelText("Next card")).toBeInTheDocument();
  });

  it("calls goTo when dot is clicked", () => {
    render(<FlashcardSwiper cards={cards} />);
    screen.getByLabelText("Go to card 2").click();
    expect(mockGoTo).toHaveBeenCalledWith(1);
  });

  it("calls goTo when next button is clicked", () => {
    render(<FlashcardSwiper cards={cards} />);
    screen.getByLabelText("Next card").click();
    expect(mockGoTo).toHaveBeenCalledWith(1);
  });
});
