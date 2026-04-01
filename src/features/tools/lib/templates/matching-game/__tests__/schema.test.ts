import { describe, expect, it } from "vitest";

import { MatchingGameConfigSchema } from "../schema";

const validConfig = {
  title: "Animal Sounds",
  pairs: [
    { id: "1", prompt: "Dog", answer: "Woof" },
    { id: "2", prompt: "Cat", answer: "Meow" },
  ],
  showAnswerImages: false,
  celebrateCorrect: true,
  highContrast: false,
};

describe("MatchingGameConfigSchema", () => {
  it("accepts a valid config", () => {
    expect(MatchingGameConfigSchema.safeParse(validConfig).success).toBe(true);
  });

  it("rejects fewer than 2 pairs", () => {
    expect(
      MatchingGameConfigSchema.safeParse({
        ...validConfig,
        pairs: [{ id: "1", prompt: "Dog", answer: "Woof" }],
      }).success
    ).toBe(false);
  });

  it("rejects more than 8 pairs", () => {
    const tooManyPairs = Array.from({ length: 9 }, (_, i) => ({
      id: String(i),
      prompt: `Word ${i}`,
      answer: `Answer ${i}`,
    }));
    expect(
      MatchingGameConfigSchema.safeParse({ ...validConfig, pairs: tooManyPairs }).success
    ).toBe(false);
  });

  it("rejects pair with empty prompt", () => {
    expect(
      MatchingGameConfigSchema.safeParse({
        ...validConfig,
        pairs: [
          { id: "1", prompt: "", answer: "Woof" },
          { id: "2", prompt: "Cat", answer: "Meow" },
        ],
      }).success
    ).toBe(false);
  });

  it("rejects pair with empty answer", () => {
    expect(
      MatchingGameConfigSchema.safeParse({
        ...validConfig,
        pairs: [
          { id: "1", prompt: "Dog", answer: "" },
          { id: "2", prompt: "Cat", answer: "Meow" },
        ],
      }).success
    ).toBe(false);
  });

  it("applies defaults when optional fields are omitted", () => {
    const minimal = {
      title: "Animal Sounds",
      pairs: [
        { id: "1", prompt: "Dog", answer: "Woof" },
        { id: "2", prompt: "Cat", answer: "Meow" },
      ],
    };
    const result = MatchingGameConfigSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.showAnswerImages).toBe(false);
      expect(result.data.celebrateCorrect).toBe(true);
      expect(result.data.highContrast).toBe(false);
    }
  });
});
