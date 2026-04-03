import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CaregiverGuidanceStrip } from "../caregiver-guidance-strip";

describe("CaregiverGuidanceStrip", () => {
  it("shows the onboarding tip during the first 60 seconds (elapsedMs < 60000)", () => {
    render(
      <CaregiverGuidanceStrip
        elapsedMs={15_000}
        durationMs={300_000}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText(/coach has this/i)).toBeInTheDocument();
  });

  it("shows the almost-done tip when within last 60 seconds", () => {
    render(
      <CaregiverGuidanceStrip
        elapsedMs={250_000}
        durationMs={300_000}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText(/almost done/i)).toBeInTheDocument();
  });

  it("shows the mid-session tip between first and last 60 seconds", () => {
    render(
      <CaregiverGuidanceStrip
        elapsedMs={120_000}
        durationMs={300_000}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText(/thumbs up/i)).toBeInTheDocument();
  });

  it("calls onDismiss when the hide button is clicked", () => {
    const onDismiss = vi.fn();
    render(
      <CaregiverGuidanceStrip
        elapsedMs={30_000}
        durationMs={300_000}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByText(/hide/i));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
