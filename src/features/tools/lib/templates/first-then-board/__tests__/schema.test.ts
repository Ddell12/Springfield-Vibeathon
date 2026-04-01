import { describe, expect, it } from "vitest";

import { FirstThenBoardConfigSchema } from "../schema";

const validConfig = {
  title: "First / Then",
  firstLabel: "Clean up",
  thenLabel: "Free time",
  firstColor: "#3B82F6",
  thenColor: "#10B981",
  highContrast: false,
  showCheckmark: true,
};

describe("FirstThenBoardConfigSchema", () => {
  it("accepts a valid config", () => {
    expect(FirstThenBoardConfigSchema.safeParse(validConfig).success).toBe(true);
  });

  it("rejects empty firstLabel", () => {
    expect(
      FirstThenBoardConfigSchema.safeParse({ ...validConfig, firstLabel: "" }).success
    ).toBe(false);
  });

  it("rejects empty thenLabel", () => {
    expect(
      FirstThenBoardConfigSchema.safeParse({ ...validConfig, thenLabel: "" }).success
    ).toBe(false);
  });

  it("rejects title longer than 100 characters", () => {
    expect(
      FirstThenBoardConfigSchema.safeParse({
        ...validConfig,
        title: "a".repeat(101),
      }).success
    ).toBe(false);
  });

  it("applies defaults when optional fields are omitted", () => {
    const minimal = {
      title: "First / Then",
      firstLabel: "Brush teeth",
      thenLabel: "iPad time",
    };
    const result = FirstThenBoardConfigSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstColor).toBe("#3B82F6");
      expect(result.data.thenColor).toBe("#10B981");
      expect(result.data.highContrast).toBe(false);
      expect(result.data.showCheckmark).toBe(true);
    }
  });

  it("accepts optional image URLs", () => {
    const result = FirstThenBoardConfigSchema.safeParse({
      ...validConfig,
      firstImageUrl: "https://example.com/brush.png",
      thenImageUrl: "https://example.com/ipad.png",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid image URL format", () => {
    expect(
      FirstThenBoardConfigSchema.safeParse({
        ...validConfig,
        firstImageUrl: "not-a-url",
      }).success
    ).toBe(false);
  });
});
