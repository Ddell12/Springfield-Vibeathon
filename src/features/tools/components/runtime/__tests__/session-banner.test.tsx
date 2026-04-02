import { act,render, screen } from "@testing-library/react";
import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import { SessionBanner } from "../session-banner";

describe("SessionBanner", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders Session label", () => {
    render(<SessionBanner />);
    expect(screen.getByText("Session")).toBeInTheDocument();
  });

  it("starts elapsed at 0:00", () => {
    render(<SessionBanner />);
    expect(screen.getByText("0:00")).toBeInTheDocument();
  });

  it("increments elapsed every second", () => {
    render(<SessionBanner />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText("0:03")).toBeInTheDocument();
  });
});
