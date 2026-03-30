import { render, screen } from "@testing-library/react";

import { createMockActivity, createMockCaregiverLink,createMockPatient } from "@/test/fixtures/patient-fixtures";

import { PatientRowExpanded } from "../patient-row-expanded";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="material-icon">{icon}</span>,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("PatientRowExpanded", () => {
  const patient = createMockPatient({
    communicationLevel: "single-word",
    interests: ["dinosaurs", "trains"],
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state when queries return undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<PatientRowExpanded patient={patient as any} />);
    // Activity section shows "Loading..."
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows empty state when no activities", () => {
    mockUseQuery.mockImplementation((_api: unknown, args: unknown) => {
      if (args && typeof args === "object" && "limit" in args) return [];
      return [];
    });
    render(<PatientRowExpanded patient={patient as any} />);
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });

  it("shows None for caregivers when empty", () => {
    mockUseQuery.mockImplementation((_api: unknown, args: unknown) => {
      if (args && typeof args === "object" && "limit" in args) return [];
      return [];
    });
    render(<PatientRowExpanded patient={patient as any} />);
    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("renders activity items", () => {
    const activities = [
      createMockActivity({ details: "Practiced /s/ sounds" }),
      createMockActivity({ _id: "activityLog_2", details: "Session completed" }),
    ];
    mockUseQuery.mockImplementation((_api: unknown, args: unknown) => {
      if (args && typeof args === "object" && "limit" in args) return activities;
      return [];
    });
    render(<PatientRowExpanded patient={patient as any} />);
    expect(screen.getByText("Practiced /s/ sounds")).toBeInTheDocument();
    expect(screen.getByText("Session completed")).toBeInTheDocument();
  });

  it("renders caregiver count", () => {
    const caregivers = [
      createMockCaregiverLink({ inviteStatus: "accepted" }),
      createMockCaregiverLink({ _id: "caregiverLinks_2", inviteStatus: "pending" }),
    ];
    mockUseQuery.mockImplementation((_api: unknown, args: unknown) => {
      if (args && typeof args === "object" && "limit" in args) return [];
      return caregivers;
    });
    render(<PatientRowExpanded patient={patient as any} />);
    expect(screen.getByText("1 linked")).toBeInTheDocument();
  });

  it("renders communication level", () => {
    mockUseQuery.mockReturnValue([]);
    render(<PatientRowExpanded patient={patient as any} />);
    expect(screen.getByText("single word")).toBeInTheDocument();
  });

  it("renders interests", () => {
    mockUseQuery.mockReturnValue([]);
    render(<PatientRowExpanded patient={patient as any} />);
    expect(screen.getByText("dinosaurs")).toBeInTheDocument();
    expect(screen.getByText("trains")).toBeInTheDocument();
  });

  it("has link to patient detail page", () => {
    mockUseQuery.mockReturnValue([]);
    render(<PatientRowExpanded patient={patient as any} />);
    expect(screen.getByText("View Full Profile").closest("a")).toHaveAttribute(
      "href",
      `/patients/${patient._id}`
    );
  });

  it("has link to new session page", () => {
    mockUseQuery.mockReturnValue([]);
    render(<PatientRowExpanded patient={patient as any} />);
    expect(screen.getByText("New Session").closest("a")).toHaveAttribute(
      "href",
      `/patients/${patient._id}/sessions/new`
    );
  });
});
