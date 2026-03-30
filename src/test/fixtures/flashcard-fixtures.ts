import type { Id } from "../../../convex/_generated/dataModel";

export function createMockDeck(overrides?: Record<string, unknown>) {
  return {
    _id: "flashcardDecks_1" as Id<"flashcardDecks">,
    _creationTime: Date.now(),
    userId: "user_1",
    title: "Animal Sounds",
    description: "Learn animal sounds for speech therapy",
    sessionId: "sessions_1" as Id<"sessions">,
    cardCount: 5,
    ...overrides,
  };
}

export function createMockCard(overrides?: Record<string, unknown>) {
  return {
    _id: "flashcards_1" as Id<"flashcards">,
    _creationTime: Date.now(),
    deckId: "flashcardDecks_1" as Id<"flashcardDecks">,
    label: "Cat",
    sortOrder: 0,
    ...overrides,
  };
}
