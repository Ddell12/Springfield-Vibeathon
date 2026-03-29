import { render, screen } from "@testing-library/react";

import { EngagementSummary } from "../engagement-summary";
import type { Id } from "../../../../../convex/_generated/dataModel";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true }),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

describe("EngagementSummary", () => {
  const patientId = "patients_1" as Id<"patients">;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state when query returns undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<EngagementSummary patientId={patientId} />);
    expect(screen.getByText(/Loading practice data/)).toBeInTheDocument();
  });

  it("shows empty state when no logs", () => {
    mockUseQuery.mockReturnValue([]);
    render(<EngagementSummary patientId={patientId} />);
    expect(screen.getByText("No practice data yet")).toBeInTheDocument();
  });

  it("renders days practiced when data available", () => {
    const today = new Date().toISOString().slice(0, 10);
    const logs = [
      { date: today, confidence: 4 },
      { date: today, confidence: 3 },
    ];
    mockUseQuery.mockReturnValue(logs);
    render(<EngagementSummary patientId={patientId} />);
    // Should show "Parent practiced X/Y days this week"
    expect(screen.getByText(/Parent practiced/)).toBeInTheDocument();
    expect(screen.getByText(/days this week/)).toBeInTheDocument();
  });

  it("renders average confidence when available", () => {
    const today = new Date().toISOString().slice(0, 10);
    const logs = [
      { date: today, confidence: 4 },
      { date: today, confidence: 2 },
    ];
    mockUseQuery.mockReturnValue(logs);
    render(<EngagementSummary patientId={patientId} />);
    // Average of 4 and 2 = 3.0
    expect(screen.getByText("3.0/5")).toBeInTheDocument();
  });

  it("does not render confidence when no confidence values", () => {
    const today = new Date().toISOString().slice(0, 10);
    const logs = [{ date: today }];
    mockUseQuery.mockReturnValue(logs);
    render(<EngagementSummary patientId={patientId} />);
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
  });

  it("shows stale warning when last log is 5+ days old", () => {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 6);
    const logs = [{ date: staleDate.toISOString().slice(0, 10), confidence: 3 }];
    mockUseQuery.mockReturnValue(logs);
    render(<EngagementSummary patientId={patientId} />);
    expect(screen.getByText("No practice logged recently")).toBeInTheDocument();
  });
});
