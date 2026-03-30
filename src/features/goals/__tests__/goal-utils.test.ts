import { describe, expect, it } from "vitest";
import {
  formatAccuracy,
  formatAccuracyWithTarget,
  trendArrow,
  domainLabel,
  promptLevelColor,
  statusBadgeColor,
  calculateStreakClient,
  checkGoalMetClient,
} from "../lib/goal-utils";

describe("goal-utils", () => {
  it("formatAccuracy handles null", () => {
    expect(formatAccuracy(null)).toBe("\u2014");
  });

  it("formatAccuracy rounds", () => {
    expect(formatAccuracy(72.7)).toBe("73%");
  });

  it("formatAccuracyWithTarget shows arrow", () => {
    expect(formatAccuracyWithTarget(72, 80)).toBe("72% \u2192 80%");
    expect(formatAccuracyWithTarget(null, 80)).toContain("80%");
  });

  it("trendArrow returns correct symbols", () => {
    expect(trendArrow("improving")).toBe("\u2191");
    expect(trendArrow("stable")).toBe("\u2192");
    expect(trendArrow("declining")).toBe("\u2193");
  });

  it("domainLabel returns readable names", () => {
    expect(domainLabel("language-receptive")).toBe("Receptive Language");
    expect(domainLabel("aac")).toBe("AAC");
  });

  it("promptLevelColor returns hex colors", () => {
    expect(promptLevelColor("independent")).toMatch(/^#/);
    expect(promptLevelColor(undefined)).toMatch(/^#/);
  });

  it("statusBadgeColor returns tailwind classes for all statuses", () => {
    for (const s of ["active", "met", "discontinued", "modified"]) {
      expect(statusBadgeColor(s)).toContain("bg-");
    }
  });

  it("calculateStreakClient counts consecutive above target", () => {
    const data = [
      { accuracy: 85 },
      { accuracy: 80 },
      { accuracy: 82 },
      { accuracy: 70 },
    ];
    expect(calculateStreakClient(data, 80)).toBe(3);
  });

  it("checkGoalMetClient returns true when streak meets target", () => {
    const data = [
      { accuracy: 85 },
      { accuracy: 82 },
      { accuracy: 80 },
    ];
    expect(checkGoalMetClient(80, 3, data)).toBe(true);
    expect(checkGoalMetClient(80, 4, data)).toBe(false);
  });
});
