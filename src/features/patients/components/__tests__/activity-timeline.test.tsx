import { render, screen } from "@testing-library/react";
import { ActivityTimeline } from "../activity-timeline";
import type { Id } from "../../../../../convex/_generated/dataModel";

const mockUsePatientActivity = vi.fn();

vi.mock("../../hooks/use-patients", () => ({
  usePatientActivity: (...args: unknown[]) => mockUsePatientActivity(...args),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="material-icon">{icon}</span>,
}));

describe("ActivityTimeline", () => {
  const patientId = "patients_1" as Id<"patients">;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state when data is undefined", () => {
    mockUsePatientActivity.mockReturnValue(undefined);
    render(<ActivityTimeline patientId={patientId} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows empty state when activity array is empty", () => {
    mockUsePatientActivity.mockReturnValue([]);
    render(<ActivityTimeline patientId={patientId} />);
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });

  it("renders the section heading", () => {
    mockUsePatientActivity.mockReturnValue([]);
    render(<ActivityTimeline patientId={patientId} />);
    expect(screen.getByText("Activity")).toBeInTheDocument();
  });

  it("renders activity entries with details text", () => {
    mockUsePatientActivity.mockReturnValue([
      {
        _id: "activityLog_1" as Id<"activityLog">,
        action: "patient-created",
        details: "Patient record created",
        timestamp: new Date("2026-03-15T10:30:00").getTime(),
      },
    ]);
    render(<ActivityTimeline patientId={patientId} />);
    expect(screen.getByText("Patient record created")).toBeInTheDocument();
  });

  it("falls back to formatted action name when details is missing", () => {
    mockUsePatientActivity.mockReturnValue([
      {
        _id: "activityLog_2" as Id<"activityLog">,
        action: "material-assigned",
        details: undefined,
        timestamp: new Date("2026-03-15T10:30:00").getTime(),
      },
    ]);
    render(<ActivityTimeline patientId={patientId} />);
    // "material-assigned" with dashes replaced by spaces
    expect(screen.getByText("material assigned")).toBeInTheDocument();
  });

  it("renders multiple activity entries", () => {
    mockUsePatientActivity.mockReturnValue([
      {
        _id: "activityLog_1" as Id<"activityLog">,
        action: "patient-created",
        details: "Record created",
        timestamp: Date.now(),
      },
      {
        _id: "activityLog_2" as Id<"activityLog">,
        action: "invite-sent",
        details: "Invitation sent to parent",
        timestamp: Date.now(),
      },
    ]);
    render(<ActivityTimeline patientId={patientId} />);
    expect(screen.getByText("Record created")).toBeInTheDocument();
    expect(screen.getByText("Invitation sent to parent")).toBeInTheDocument();
  });

  it("passes patientId to the hook", () => {
    mockUsePatientActivity.mockReturnValue(undefined);
    render(<ActivityTimeline patientId={patientId} />);
    expect(mockUsePatientActivity).toHaveBeenCalledWith(patientId);
  });
});
