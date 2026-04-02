import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DEFAULT_SUMMARY = [
  {
    appInstanceId: "inst-1",
    title: "Marcus Token Board",
    templateType: "token_board",
    status: "published",
    shareToken: "tok-abc",
    goalTags: ["positive reinforcement"],
    totalEvents: 10,
    completions: 4,
    interactions: 8,
    lastActivityAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
  },
  {
    appInstanceId: "inst-2",
    title: "Old Board",
    templateType: "aac_board",
    status: "published",
    shareToken: null,
    goalTags: [],
    totalEvents: 3,
    completions: 1,
    interactions: 2,
    lastActivityAt: Date.now() - 20 * 24 * 60 * 60 * 1000, // 20 days ago
  },
];

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => DEFAULT_SUMMARY),
}));

import { useQuery } from "convex/react";

import { ToolActivitySummary } from "../tool-activity-summary";

const PATIENT_ID = "pat123" as any;

describe("ToolActivitySummary", () => {
  afterEach(() => {
    // Restore to the default two-item dataset after per-test overrides
    vi.mocked(useQuery).mockImplementation(() => DEFAULT_SUMMARY);
  });

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
        goalTags: [],
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

describe("ToolActivitySummary — time filter", () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockImplementation(() => DEFAULT_SUMMARY);
  });

  it("shows both tools on 'All time' (default)", () => {
    render(<ToolActivitySummary patientId={"patient-1" as any} />);
    expect(screen.getByText("Marcus Token Board")).toBeInTheDocument();
    expect(screen.getByText("Old Board")).toBeInTheDocument();
  });

  it("hides old tool when 'Last 7 days' selected", () => {
    render(<ToolActivitySummary patientId={"patient-1" as any} />);
    fireEvent.click(screen.getByRole("button", { name: /last 7 days/i }));
    expect(screen.getByText("Marcus Token Board")).toBeInTheDocument();
    expect(screen.queryByText("Old Board")).not.toBeInTheDocument();
  });
});

describe("ToolActivitySummary — goal tags", () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockImplementation(() => DEFAULT_SUMMARY);
  });

  it("shows goal tag pills", () => {
    render(<ToolActivitySummary patientId={"patient-1" as any} />);
    expect(screen.getByText("positive reinforcement")).toBeInTheDocument();
  });
});
