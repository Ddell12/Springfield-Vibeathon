import { describe, expect, it } from "vitest";

import { TokenBoardConfigSchema } from "../schema";

const validConfig = {
  title: "Token Board",
  tokenCount: 5,
  rewardLabel: "5 minutes of free choice",
  tokenShape: "star" as const,
  tokenColor: "#FBBF24",
  highContrast: false,
};

describe("TokenBoardConfigSchema", () => {
  it("accepts a valid config", () => {
    expect(TokenBoardConfigSchema.safeParse(validConfig).success).toBe(true);
  });

  it("rejects tokenCount below 3", () => {
    expect(
      TokenBoardConfigSchema.safeParse({ ...validConfig, tokenCount: 2 }).success
    ).toBe(false);
  });

  it("rejects tokenCount above 10", () => {
    expect(
      TokenBoardConfigSchema.safeParse({ ...validConfig, tokenCount: 11 }).success
    ).toBe(false);
  });

  it("rejects empty rewardLabel", () => {
    expect(
      TokenBoardConfigSchema.safeParse({ ...validConfig, rewardLabel: "" }).success
    ).toBe(false);
  });

  it("rejects invalid tokenShape", () => {
    expect(
      TokenBoardConfigSchema.safeParse({ ...validConfig, tokenShape: "square" }).success
    ).toBe(false);
  });

  it("applies defaults when optional fields are omitted", () => {
    const minimal = {
      title: "Token Board",
      rewardLabel: "5 minutes of tablet",
    };
    const result = TokenBoardConfigSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tokenCount).toBe(5);
      expect(result.data.tokenShape).toBe("star");
      expect(result.data.tokenColor).toBe("#FBBF24");
      expect(result.data.highContrast).toBe(false);
    }
  });

  it("accepts all valid token shapes", () => {
    for (const shape of ["star", "circle", "heart"] as const) {
      expect(
        TokenBoardConfigSchema.safeParse({ ...validConfig, tokenShape: shape }).success
      ).toBe(true);
    }
  });
});
