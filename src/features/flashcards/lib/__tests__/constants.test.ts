import { describe, expect, it } from "vitest";
import { FLASHCARD_SUGGESTIONS } from "../constants";

describe("FLASHCARD_SUGGESTIONS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(FLASHCARD_SUGGESTIONS)).toBe(true);
    expect(FLASHCARD_SUGGESTIONS.length).toBeGreaterThan(0);
  });

  it("contains only strings", () => {
    for (const suggestion of FLASHCARD_SUGGESTIONS) {
      expect(typeof suggestion).toBe("string");
      expect(suggestion.length).toBeGreaterThan(0);
    }
  });
});
