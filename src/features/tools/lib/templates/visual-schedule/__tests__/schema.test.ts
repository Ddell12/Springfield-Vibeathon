import { describe, expect, it } from "vitest";

import { VisualScheduleConfigSchema } from "../schema";

const validConfig = {
  title: "Morning Routine",
  items: [
    { id: "1", label: "Wake up", durationMinutes: 5 },
    { id: "2", label: "Get dressed", durationMinutes: 10 },
  ],
  showDuration: true,
  highContrast: false,
  showCheckmarks: true,
};

describe("VisualScheduleConfigSchema", () => {
  it("accepts a valid config", () => {
    expect(VisualScheduleConfigSchema.safeParse(validConfig).success).toBe(true);
  });

  it("rejects empty items array", () => {
    expect(
      VisualScheduleConfigSchema.safeParse({ ...validConfig, items: [] }).success
    ).toBe(false);
  });

  it("rejects more than 12 items", () => {
    const tooManyItems = Array.from({ length: 13 }, (_, i) => ({
      id: String(i),
      label: `Step ${i}`,
    }));
    expect(
      VisualScheduleConfigSchema.safeParse({ ...validConfig, items: tooManyItems }).success
    ).toBe(false);
  });

  it("rejects item with empty label", () => {
    expect(
      VisualScheduleConfigSchema.safeParse({
        ...validConfig,
        items: [{ id: "1", label: "" }],
      }).success
    ).toBe(false);
  });

  it("rejects durationMinutes outside range", () => {
    expect(
      VisualScheduleConfigSchema.safeParse({
        ...validConfig,
        items: [{ id: "1", label: "Step", durationMinutes: 121 }],
      }).success
    ).toBe(false);
  });

  it("applies defaults when optional fields are omitted", () => {
    const minimal = {
      title: "My Schedule",
      items: [{ id: "1", label: "Breakfast" }],
    };
    const result = VisualScheduleConfigSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.showDuration).toBe(false);
      expect(result.data.highContrast).toBe(false);
      expect(result.data.showCheckmarks).toBe(true);
    }
  });
});
