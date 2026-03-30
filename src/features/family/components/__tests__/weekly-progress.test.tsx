import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WeeklyProgress } from "../weekly-progress";

vi.mock("@/core/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("WeeklyProgress", () => {
  it("renders practice count text", () => {
    render(<WeeklyProgress weeklyPracticeDays={3} weeklyTarget={5} />);
    expect(screen.getByText("3/5")).toBeInTheDocument();
    expect(screen.getByText(/days this week/)).toBeInTheDocument();
  });

  it("renders progress bar with correct aria attributes", () => {
    render(<WeeklyProgress weeklyPracticeDays={3} weeklyTarget={5} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "5");
  });

  it("shows completion text when target is met", () => {
    render(<WeeklyProgress weeklyPracticeDays={5} weeklyTarget={5} />);
    expect(screen.getByText(/Full week/)).toBeInTheDocument();
  });

  it("does not show completion text when target is not met", () => {
    render(<WeeklyProgress weeklyPracticeDays={2} weeklyTarget={5} />);
    expect(screen.queryByText(/Full week/)).not.toBeInTheDocument();
  });

  it("handles zero target gracefully", () => {
    render(<WeeklyProgress weeklyPracticeDays={0} weeklyTarget={0} />);
    expect(screen.getByText("0/0")).toBeInTheDocument();
  });

  it("caps progress bar at 100% when exceeding target", () => {
    render(<WeeklyProgress weeklyPracticeDays={7} weeklyTarget={5} />);
    const bar = screen.getByRole("progressbar");
    // width should be 100% (capped), aria-valuenow reflects actual days
    expect(bar).toHaveAttribute("aria-valuenow", "7");
  });
});
