import { fireEvent,render, screen } from "@testing-library/react";

import { createMockHomeProgram } from "@/test/fixtures/patient-fixtures";

import type { Id } from "../../../../../convex/_generated/dataModel";
import { HomeProgramsWidget } from "../home-programs-widget";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true }),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="material-icon">{icon}</span>,
}));

// Mock child components to isolate
vi.mock("../home-program-form", () => ({
  HomeProgramForm: ({ open }: { open: boolean }) =>
    open ? <div data-testid="home-program-form">Form</div> : null,
}));

vi.mock("../engagement-summary", () => ({
  EngagementSummary: () => <div data-testid="engagement-summary">Engagement</div>,
}));

describe("HomeProgramsWidget", () => {
  const patientId = "patients_1" as Id<"patients">;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state when useQuery returns undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<HomeProgramsWidget patientId={patientId} />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it("shows empty state with assign button when no programs", () => {
    mockUseQuery.mockReturnValue([]);
    render(<HomeProgramsWidget patientId={patientId} />);
    expect(screen.getByText("No home programs assigned yet")).toBeInTheDocument();
    expect(screen.getByText("Assign first program")).toBeInTheDocument();
  });

  it("renders program list with title, frequency, and status", () => {
    const programs = [
      createMockHomeProgram(),
      createMockHomeProgram({
        _id: "homePrograms_2",
        title: "Vocabulary Building",
        frequency: "3x-week",
        status: "paused",
      }),
    ];
    mockUseQuery.mockReturnValue(programs);
    render(<HomeProgramsWidget patientId={patientId} />);

    expect(screen.getByText("Articulation Practice")).toBeInTheDocument();
    expect(screen.getByText("Daily")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();

    expect(screen.getByText("Vocabulary Building")).toBeInTheDocument();
    expect(screen.getByText("3x / week")).toBeInTheDocument();
    expect(screen.getByText("paused")).toBeInTheDocument();
  });

  it("shows EngagementSummary when programs exist", () => {
    mockUseQuery.mockReturnValue([createMockHomeProgram()]);
    render(<HomeProgramsWidget patientId={patientId} />);
    expect(screen.getByTestId("engagement-summary")).toBeInTheDocument();
  });

  it("does not show EngagementSummary when no programs", () => {
    mockUseQuery.mockReturnValue([]);
    render(<HomeProgramsWidget patientId={patientId} />);
    expect(screen.queryByTestId("engagement-summary")).not.toBeInTheDocument();
  });

  it("opens form when Assign button is clicked", () => {
    mockUseQuery.mockReturnValue([]);
    render(<HomeProgramsWidget patientId={patientId} />);
    expect(screen.queryByTestId("home-program-form")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Assign first program"));
    expect(screen.getByTestId("home-program-form")).toBeInTheDocument();
  });

  it("opens form when header Assign button is clicked", () => {
    mockUseQuery.mockReturnValue([createMockHomeProgram()]);
    render(<HomeProgramsWidget patientId={patientId} />);

    fireEvent.click(screen.getByText("Assign"));
    expect(screen.getByTestId("home-program-form")).toBeInTheDocument();
  });
});
