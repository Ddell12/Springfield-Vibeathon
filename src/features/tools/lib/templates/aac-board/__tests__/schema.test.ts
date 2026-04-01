import { describe, expect, it } from "vitest";

import { AACBoardConfigSchema } from "../schema";

const validConfig = {
  title: "Snack Requests",
  gridCols: 3,
  gridRows: 2,
  buttons: [
    { id: "1", label: "Crackers", speakText: "I want crackers" },
    { id: "2", label: "Drink", speakText: "I want a drink" },
  ],
  showTextLabels: true,
  autoSpeak: true,
  voice: "child-friendly" as const,
  highContrast: false,
};

describe("AACBoardConfigSchema", () => {
  it("accepts a valid config", () => {
    expect(AACBoardConfigSchema.safeParse(validConfig).success).toBe(true);
  });

  it("rejects empty buttons array", () => {
    expect(
      AACBoardConfigSchema.safeParse({ ...validConfig, buttons: [] }).success
    ).toBe(false);
  });

  it("rejects gridCols above 6", () => {
    expect(
      AACBoardConfigSchema.safeParse({ ...validConfig, gridCols: 7 }).success
    ).toBe(false);
  });

  it("rejects a button with empty label", () => {
    expect(
      AACBoardConfigSchema.safeParse({
        ...validConfig,
        buttons: [{ id: "1", label: "", speakText: "say something" }],
      }).success
    ).toBe(false);
  });

  it("strips unknown top-level fields", () => {
    const result = AACBoardConfigSchema.safeParse({
      ...validConfig,
      unknownField: "should be stripped",
    });
    expect(result.success).toBe(true);
    if (result.success) expect("unknownField" in result.data).toBe(false);
  });

  it("applies defaults when optional fields are omitted", () => {
    const minimal = {
      title: "Board",
      buttons: [{ id: "1", label: "Yes", speakText: "Yes" }],
    };
    const result = AACBoardConfigSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gridCols).toBe(3);
      expect(result.data.voice).toBe("child-friendly");
      expect(result.data.showTextLabels).toBe(true);
    }
  });
});
