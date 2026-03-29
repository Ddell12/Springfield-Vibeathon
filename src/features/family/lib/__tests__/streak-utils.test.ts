import { describe, expect, it } from "vitest";
import { calculateStreak, getWeeklyPracticeDays } from "../streak-utils";

describe("calculateStreak", () => {
  it("returns 0 for empty dates", () => {
    expect(calculateStreak([], "2026-03-28")).toBe(0);
  });
  it("returns 1 for today only", () => {
    expect(calculateStreak(["2026-03-28"], "2026-03-28")).toBe(1);
  });
  it("counts consecutive days", () => {
    expect(calculateStreak(["2026-03-26", "2026-03-27", "2026-03-28"], "2026-03-28")).toBe(3);
  });
  it("allows starting from yesterday", () => {
    expect(calculateStreak(["2026-03-26", "2026-03-27"], "2026-03-28")).toBe(2);
  });
  it("gap resets streak", () => {
    expect(calculateStreak(["2026-03-25", "2026-03-28"], "2026-03-28")).toBe(1);
  });
  it("deduplicates dates", () => {
    expect(calculateStreak(["2026-03-28", "2026-03-28"], "2026-03-28")).toBe(1);
  });
});

describe("getWeeklyPracticeDays", () => {
  it("counts unique days in current week", () => {
    // 2026-03-23 is Monday, 2026-03-29 is Sunday
    expect(getWeeklyPracticeDays(["2026-03-23", "2026-03-25", "2026-03-28"], "2026-03-28")).toBe(3);
  });
  it("excludes dates outside current week", () => {
    expect(getWeeklyPracticeDays(["2026-03-22", "2026-03-28"], "2026-03-28")).toBe(1);
  });
});
