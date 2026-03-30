import { describe, expect, it } from "vitest";
import { calculateStreak, detectTrend, checkGoalMet } from "../lib/progress";

describe("calculateStreak", () => {
  it("returns 0 for empty data", () => {
    expect(calculateStreak([], 80)).toBe(0);
  });

  it("counts consecutive sessions at or above target", () => {
    const data = [
      { accuracy: 85, date: "2026-03-28" },
      { accuracy: 80, date: "2026-03-27" },
      { accuracy: 82, date: "2026-03-26" },
      { accuracy: 70, date: "2026-03-25" },
      { accuracy: 90, date: "2026-03-24" },
    ];
    expect(calculateStreak(data, 80)).toBe(3);
  });

  it("stops at first miss", () => {
    const data = [
      { accuracy: 90, date: "2026-03-28" },
      { accuracy: 60, date: "2026-03-27" },
      { accuracy: 90, date: "2026-03-26" },
    ];
    expect(calculateStreak(data, 80)).toBe(1);
  });

  it("counts all if all above target", () => {
    const data = [
      { accuracy: 90, date: "2026-03-28" },
      { accuracy: 85, date: "2026-03-27" },
      { accuracy: 80, date: "2026-03-26" },
    ];
    expect(calculateStreak(data, 80)).toBe(3);
  });

  it("returns 0 if first (most recent) is below target", () => {
    const data = [
      { accuracy: 70, date: "2026-03-28" },
      { accuracy: 90, date: "2026-03-27" },
    ];
    expect(calculateStreak(data, 80)).toBe(0);
  });
});

describe("detectTrend", () => {
  it("returns stable for fewer than 5 data points", () => {
    expect(detectTrend([
      { accuracy: 90, date: "2026-03-28" },
      { accuracy: 80, date: "2026-03-27" },
    ])).toBe("stable");
  });

  it("detects improving trend", () => {
    const data = [
      { accuracy: 90, date: "2026-03-28" },
      { accuracy: 85, date: "2026-03-27" },
      { accuracy: 80, date: "2026-03-26" },
      { accuracy: 70, date: "2026-03-25" },
      { accuracy: 60, date: "2026-03-24" },
    ];
    expect(detectTrend(data)).toBe("improving");
  });

  it("detects declining trend", () => {
    const data = [
      { accuracy: 60, date: "2026-03-28" },
      { accuracy: 70, date: "2026-03-27" },
      { accuracy: 80, date: "2026-03-26" },
      { accuracy: 85, date: "2026-03-25" },
      { accuracy: 90, date: "2026-03-24" },
    ];
    expect(detectTrend(data)).toBe("declining");
  });

  it("detects stable trend", () => {
    const data = [
      { accuracy: 80, date: "2026-03-28" },
      { accuracy: 81, date: "2026-03-27" },
      { accuracy: 79, date: "2026-03-26" },
      { accuracy: 80, date: "2026-03-25" },
      { accuracy: 80, date: "2026-03-24" },
    ];
    expect(detectTrend(data)).toBe("stable");
  });
});

describe("checkGoalMet", () => {
  it("returns true when streak meets target", () => {
    const data = [
      { accuracy: 85, date: "2026-03-28" },
      { accuracy: 82, date: "2026-03-27" },
      { accuracy: 80, date: "2026-03-26" },
    ];
    expect(checkGoalMet(80, 3, data)).toBe(true);
  });

  it("returns false when streak is short", () => {
    const data = [
      { accuracy: 85, date: "2026-03-28" },
      { accuracy: 82, date: "2026-03-27" },
      { accuracy: 70, date: "2026-03-26" },
    ];
    expect(checkGoalMet(80, 3, data)).toBe(false);
  });

  it("returns true when streak exceeds target", () => {
    const data = [
      { accuracy: 90, date: "2026-03-28" },
      { accuracy: 85, date: "2026-03-27" },
      { accuracy: 82, date: "2026-03-26" },
      { accuracy: 80, date: "2026-03-25" },
    ];
    expect(checkGoalMet(80, 3, data)).toBe(true);
  });
});
