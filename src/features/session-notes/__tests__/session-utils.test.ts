import { describe, expect, it } from "vitest";

import {
  accuracyColor,
  accuracyLabel,
  calculateAccuracy,
  formatDuration,
} from "../lib/session-utils";

describe("formatDuration", () => {
  it("returns minutes for values under 60", () => {
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(1)).toBe("1 min");
    expect(formatDuration(59)).toBe("59 min");
  });

  it("returns hours only for exact multiples of 60", () => {
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(120)).toBe("2h");
  });

  it("returns hours and minutes for mixed values", () => {
    expect(formatDuration(90)).toBe("1h 30min");
    expect(formatDuration(75)).toBe("1h 15min");
    expect(formatDuration(150)).toBe("2h 30min");
  });

  it("handles zero", () => {
    expect(formatDuration(0)).toBe("0 min");
  });
});

describe("calculateAccuracy", () => {
  it("calculates percentage correctly", () => {
    expect(calculateAccuracy(8, 10)).toBe(80);
    expect(calculateAccuracy(3, 4)).toBe(75);
    expect(calculateAccuracy(10, 10)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(calculateAccuracy(1, 3)).toBe(33);
    expect(calculateAccuracy(2, 3)).toBe(67);
  });

  it("returns null for zero trials", () => {
    expect(calculateAccuracy(0, 0)).toBeNull();
  });

  it("returns null for undefined trials", () => {
    expect(calculateAccuracy(5, undefined)).toBeNull();
    expect(calculateAccuracy(undefined, undefined)).toBeNull();
  });

  it("returns null for undefined correct", () => {
    expect(calculateAccuracy(undefined, 10)).toBeNull();
  });

  it("handles zero correct with nonzero trials", () => {
    expect(calculateAccuracy(0, 10)).toBe(0);
  });
});

describe("accuracyColor", () => {
  it("returns green for 80 and above", () => {
    expect(accuracyColor(80)).toBe("text-green-600 dark:text-green-400");
    expect(accuracyColor(100)).toBe("text-green-600 dark:text-green-400");
    expect(accuracyColor(95)).toBe("text-green-600 dark:text-green-400");
  });

  it("returns yellow for 60-79", () => {
    expect(accuracyColor(60)).toBe("text-yellow-600 dark:text-yellow-400");
    expect(accuracyColor(79)).toBe("text-yellow-600 dark:text-yellow-400");
    expect(accuracyColor(70)).toBe("text-yellow-600 dark:text-yellow-400");
  });

  it("returns red for below 60", () => {
    expect(accuracyColor(59)).toBe("text-red-600 dark:text-red-400");
    expect(accuracyColor(0)).toBe("text-red-600 dark:text-red-400");
    expect(accuracyColor(30)).toBe("text-red-600 dark:text-red-400");
  });

  it("returns muted for null", () => {
    expect(accuracyColor(null)).toBe("text-muted-foreground");
  });
});

describe("accuracyLabel", () => {
  it("returns percentage with check mark for 80+", () => {
    expect(accuracyLabel(80)).toBe("80% \u2713");
    expect(accuracyLabel(100)).toBe("100% \u2713");
  });

  it("returns plain percentage for below 80", () => {
    expect(accuracyLabel(79)).toBe("79%");
    expect(accuracyLabel(50)).toBe("50%");
    expect(accuracyLabel(0)).toBe("0%");
  });

  it("returns em dash for null", () => {
    expect(accuracyLabel(null)).toBe("\u2014");
  });
});
