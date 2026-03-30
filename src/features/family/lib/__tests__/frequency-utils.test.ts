import { describe, expect, it } from "vitest";
import { isDueToday, frequencySortOrder } from "../frequency-utils";

describe("isDueToday", () => {
  it("daily is always due", () => { expect(isDueToday("daily", 0)).toBe(true); });
  it("3x-week due when fewer than 3", () => {
    expect(isDueToday("3x-week", 2)).toBe(true);
    expect(isDueToday("3x-week", 3)).toBe(false);
  });
  it("weekly due when 0", () => {
    expect(isDueToday("weekly", 0)).toBe(true);
    expect(isDueToday("weekly", 1)).toBe(false);
  });
  it("as-needed always due", () => { expect(isDueToday("as-needed", 0)).toBe(true); });
});

describe("frequencySortOrder", () => {
  it("daily < 3x-week < weekly < as-needed", () => {
    expect(frequencySortOrder("daily")).toBeLessThan(frequencySortOrder("3x-week"));
    expect(frequencySortOrder("3x-week")).toBeLessThan(frequencySortOrder("weekly"));
    expect(frequencySortOrder("weekly")).toBeLessThan(frequencySortOrder("as-needed"));
  });
});
