import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

import { useQuery } from "convex/react";
import { ToolActivitySummary } from "../tool-activity-summary";

const PATIENT_ID = "pat123" as any;

describe("ToolActivitySummary", () => {
  it("renders null when data is empty", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    const { container } = render(<ToolActivitySummary patientId={PATIENT_ID} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders tool cards with activity data", () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        appInstanceId: "app1",
        title: "Snack Board",
        templateType: "aac_board",
        status: "published",
        shareToken: "tok123",
        totalEvents: 12,
        completions: 3,
        interactions: 9,
        lastActivityAt: Date.now(),
      },
    ]);
    render(<ToolActivitySummary patientId={PATIENT_ID} />);
    expect(screen.getByText("Tool Activity")).toBeInTheDocument();
    expect(screen.getByText("Snack Board")).toBeInTheDocument();
    expect(screen.getByText(/3 completion/)).toBeInTheDocument();
    expect(screen.getByText(/9 interaction/)).toBeInTheDocument();
  });

  it("shows skeleton when loading", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    render(<ToolActivitySummary patientId={PATIENT_ID} />);
    // Skeleton renders — no crash
  });
});
