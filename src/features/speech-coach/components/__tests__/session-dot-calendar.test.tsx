import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SessionDotCalendar } from "../session-dot-calendar";

const NOW = new Date("2026-04-02T12:00:00Z").getTime();

describe("SessionDotCalendar", () => {
  it("renders 30 day slots", () => {
    render(<SessionDotCalendar sessionTimestamps={[]} nowMs={NOW} />);
    const dots = document.querySelectorAll('[data-testid="calendar-day"]');
    expect(dots.length).toBe(30);
  });

  it("shows filled dot for a day that had a session", () => {
    const yesterday = NOW - 24 * 60 * 60 * 1000;
    render(<SessionDotCalendar sessionTimestamps={[yesterday]} nowMs={NOW} />);
    const filledDots = document.querySelectorAll('[data-filled="true"]');
    expect(filledDots.length).toBe(1);
  });

  it("shows empty dot for days without sessions", () => {
    render(<SessionDotCalendar sessionTimestamps={[]} nowMs={NOW} />);
    const emptyDots = document.querySelectorAll('[data-filled="false"]');
    expect(emptyDots.length).toBe(30);
  });
});
