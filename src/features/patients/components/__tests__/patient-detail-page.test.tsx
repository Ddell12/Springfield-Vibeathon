import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";

import { createMockPatient } from "@/test/fixtures/patient-fixtures";

import { PatientDetailPage } from "../patient-detail-page";

const mockUsePatient = vi.fn();
const mockNotFound = vi.fn();

vi.mock("../../hooks/use-patients", () => ({
  usePatient: (...args: unknown[]) => mockUsePatient(...args),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound();
    // Don't throw — just track the call. The component will continue rendering
    // but we verify notFound was called.
  },
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

// Mock all child widgets to isolate page-level tests
vi.mock("../patient-profile-widget", () => ({
  PatientProfileWidget: () => <div data-testid="profile-widget">Profile</div>,
}));
vi.mock("../activity-timeline", () => ({
  ActivityTimeline: () => <div data-testid="activity-timeline">Timeline</div>,
}));
vi.mock("../assigned-materials", () => ({
  AssignedMaterials: () => <div data-testid="assigned-materials">Materials</div>,
}));
vi.mock("../caregiver-info", () => ({
  CaregiverInfo: () => <div data-testid="caregiver-info">Caregivers</div>,
}));
vi.mock("../home-programs-widget", () => ({
  HomeProgramsWidget: () => <div data-testid="home-programs">Programs</div>,
}));
vi.mock("../quick-notes", () => ({
  QuickNotes: () => <div data-testid="quick-notes">Quick Notes</div>,
}));
vi.mock("@/shared/components/child-apps-section", () => ({
  ChildAppsSection: () => null,
}));
vi.mock("@/features/intake/components/intake-status-widget", () => ({
  IntakeStatusWidget: () => null,
}));

// Mock React.use to return params synchronously (avoids Suspense complexity)
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    use: (promise: Promise<unknown>) => {
      // For our tests, the promise value is already known
      // Return a default value synchronously
      return { id: "patients_1" };
    },
  };
});

describe("PatientDetailPage", () => {
  const paramsPromise = Promise.resolve({ id: "patients_1" });

  it("shows loading state when patient is undefined", () => {
    mockUsePatient.mockReturnValue(undefined);
    render(<PatientDetailPage paramsPromise={paramsPromise} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders overview tab widgets by default", () => {
    mockUsePatient.mockReturnValue(createMockPatient());
    render(
      <PatientDetailPage
        paramsPromise={paramsPromise}
        clinicalWidgets={() => (
          <>
            <div data-testid="goals-list">Goals</div>
            <div data-testid="session-notes">Notes</div>
          </>
        )}
      />
    );

    // Overview tab (default) should show profile + caregiver
    expect(screen.getByTestId("profile-widget")).toBeInTheDocument();
    expect(screen.getByTestId("caregiver-info")).toBeInTheDocument();
  });

  it("renders materials tab widgets when tab is clicked", async () => {
    const user = userEvent.setup();
    mockUsePatient.mockReturnValue(createMockPatient());
    render(<PatientDetailPage paramsPromise={paramsPromise} />);

    await user.click(screen.getByRole("tab", { name: "Materials" }));

    expect(screen.getByTestId("assigned-materials")).toBeInTheDocument();
    expect(screen.getByTestId("home-programs")).toBeInTheDocument();
  });

  it("renders notes tab widgets when tab is clicked", async () => {
    const user = userEvent.setup();
    mockUsePatient.mockReturnValue(createMockPatient());
    render(<PatientDetailPage paramsPromise={paramsPromise} />);

    await user.click(screen.getByRole("tab", { name: "Notes" }));

    expect(screen.getByTestId("activity-timeline")).toBeInTheDocument();
    expect(screen.getByTestId("quick-notes")).toBeInTheDocument();
  });

  it("renders clinical tab widgets when tab is clicked", async () => {
    const user = userEvent.setup();
    mockUsePatient.mockReturnValue(createMockPatient());
    render(
      <PatientDetailPage
        paramsPromise={paramsPromise}
        clinicalWidgets={() => (
          <>
            <div data-testid="goals-list">Goals</div>
            <div data-testid="session-notes">Notes</div>
          </>
        )}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Clinical" }));

    expect(screen.getByTestId("goals-list")).toBeInTheDocument();
    expect(screen.getByTestId("session-notes")).toBeInTheDocument();
  });

  it("renders back link to caseload", () => {
    mockUsePatient.mockReturnValue(createMockPatient());
    render(<PatientDetailPage paramsPromise={paramsPromise} />);

    const backLink = screen.getByRole("link", { name: /back to caseload/i });
    expect(backLink).toHaveAttribute("href", "/patients");
  });

  it("passes patient id to usePatient hook", () => {
    mockUsePatient.mockReturnValue(undefined);
    render(<PatientDetailPage paramsPromise={paramsPromise} />);
    expect(mockUsePatient).toHaveBeenCalledWith("patients_1");
  });
});
