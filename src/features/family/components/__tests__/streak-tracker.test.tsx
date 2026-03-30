import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StreakTracker } from "../streak-tracker";

vi.mock("@/shared/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("@/core/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("StreakTracker", () => {
  it("renders 'Start your streak!' when streak is 0", () => {
    render(
      <StreakTracker
        streakData={{ currentStreak: 0, weeklyPracticeDays: 0, weeklyTarget: 5 }}
      />
    );
    expect(screen.getByText("Start your streak!")).toBeInTheDocument();
  });

  it("renders helper text to log first practice when streak is 0", () => {
    render(
      <StreakTracker
        streakData={{ currentStreak: 0, weeklyPracticeDays: 0, weeklyTarget: 5 }}
      />
    );
    expect(
      screen.getByText("Log your first practice to get started")
    ).toBeInTheDocument();
  });

  it("renders streak count label when streak is 1 or 2", () => {
    render(
      <StreakTracker
        streakData={{ currentStreak: 2, weeklyPracticeDays: 2, weeklyTarget: 5 }}
      />
    );
    expect(screen.getByText("2-day streak!")).toBeInTheDocument();
  });

  it("renders flame icon (🔥) when streak is >= 3", () => {
    render(
      <StreakTracker
        streakData={{ currentStreak: 5, weeklyPracticeDays: 5, weeklyTarget: 5 }}
      />
    );
    expect(screen.getByText("5-day streak!")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "streak icon" })).toHaveTextContent("🔥");
  });

  it("renders sparkle icon (✨) when streak is 1 or 2", () => {
    render(
      <StreakTracker
        streakData={{ currentStreak: 1, weeklyPracticeDays: 1, weeklyTarget: 5 }}
      />
    );
    expect(screen.getByRole("img", { name: "streak icon" })).toHaveTextContent("✨");
  });

  it("renders 7 day dots for the week", () => {
    render(
      <StreakTracker
        streakData={{ currentStreak: 3, weeklyPracticeDays: 3, weeklyTarget: 5 }}
      />
    );
    // 7 day label spans: M, T, W, T, F, S, S
    const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
    // getAllByText for repeated letters
    const mLabels = screen.getAllByText("M");
    const tLabels = screen.getAllByText("T");
    const wLabels = screen.getAllByText("W");
    const fLabels = screen.getAllByText("F");
    const sLabels = screen.getAllByText("S");
    expect(mLabels).toHaveLength(1);
    expect(tLabels).toHaveLength(2); // Tuesday and Thursday
    expect(wLabels).toHaveLength(1);
    expect(fLabels).toHaveLength(1);
    expect(sLabels).toHaveLength(2); // Saturday and Sunday
    // Total = 7 day labels
    const total =
      mLabels.length +
      tLabels.length +
      wLabels.length +
      fLabels.length +
      sLabels.length;
    expect(total).toBe(7);
  });

  it("renders encouragement text when streak > 0", () => {
    render(
      <StreakTracker
        streakData={{ currentStreak: 4, weeklyPracticeDays: 4, weeklyTarget: 5 }}
      />
    );
    expect(
      screen.getByText("Keep it going — every day counts!")
    ).toBeInTheDocument();
  });

  it("renders practice prompt icon when streak is 0", () => {
    render(
      <StreakTracker
        streakData={{ currentStreak: 0, weeklyPracticeDays: 0, weeklyTarget: 5 }}
      />
    );
    expect(screen.getByRole("img", { name: "practice prompt" })).toHaveTextContent("💪");
  });
});
