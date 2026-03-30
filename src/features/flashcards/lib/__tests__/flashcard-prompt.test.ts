import { describe, expect, it } from "vitest";

import {
  buildFlashcardSystemPrompt,
  FLASHCARD_SYSTEM_PROMPT,
} from "../flashcard-prompt";

describe("flashcard-prompt", () => {
  it("FLASHCARD_SYSTEM_PROMPT is a non-empty string", () => {
    expect(typeof FLASHCARD_SYSTEM_PROMPT).toBe("string");
    expect(FLASHCARD_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it("contains key instructions for card design", () => {
    expect(FLASHCARD_SYSTEM_PROMPT).toContain("create_deck");
    expect(FLASHCARD_SYSTEM_PROMPT).toContain("create_cards");
    expect(FLASHCARD_SYSTEM_PROMPT).toContain("Card Design Guidelines");
  });

  it("mentions therapy context", () => {
    expect(FLASHCARD_SYSTEM_PROMPT).toContain("therapy");
  });

  it("buildFlashcardSystemPrompt returns the constant", () => {
    const result = buildFlashcardSystemPrompt();
    expect(result).toBe(FLASHCARD_SYSTEM_PROMPT);
  });

  it("buildFlashcardSystemPrompt returns a non-empty string", () => {
    const result = buildFlashcardSystemPrompt();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
