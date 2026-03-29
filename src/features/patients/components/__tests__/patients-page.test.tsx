import { render, screen, fireEvent } from "@testing-library/react";
import { createMockPatient } from "@/test/fixtures/patient-fixtures";
import { PatientsPage } from "../patients-page";

const mockUsePatients = vi.fn();
const mockUsePatientStats = vi.fn();

vi.mock("../../hooks/use-patients", () => ({
  usePatients: (...args: unknown[]) => mockUsePatients(...args),
  usePatientStats: () => mockUsePatientStats(),
}));
vi.mock("../patient-row", () => ({
  PatientRow: ({ patient, onToggle }: any) => (
    <div data-testid={`patient-row-${patient._id}`} onClick={onToggle}>
      {patient.firstName} {patient.lastName}
    </div>
  ),
}));
vi.mock("../patient-row-expanded", () => ({
  PatientRowExpanded: ({ patient }: any) => (
    <div data-testid={`expanded-${patient._id}`}>Expanded</div>
  ),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

describe("PatientsPage", () => {
  beforeEach(() => {
    mockUsePatientStats.mockReturnValue({ active: 3 });
  });

  it("shows loading state when patients undefined", () => {
    mockUsePatients.mockReturnValue(undefined);
    render(<PatientsPage />);
    expect(screen.getByText("Loading caseload...")).toBeInTheDocument();
  });

  it("shows empty state when no patients", () => {
    mockUsePatients.mockReturnValue([]);
    render(<PatientsPage />);
    expect(screen.getByText("No patients yet")).toBeInTheDocument();
    expect(screen.getByText("Add your first patient")).toBeInTheDocument();
  });

  it("renders patient rows", () => {
    const patients = [
      createMockPatient({ _id: "p1", firstName: "Alex", lastName: "Smith" }),
      createMockPatient({ _id: "p2", firstName: "Jordan", lastName: "Lee" }),
    ];
    mockUsePatients.mockReturnValue(patients);
    render(<PatientsPage />);
    expect(screen.getByText("Alex Smith")).toBeInTheDocument();
    expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
  });

  it("shows stats in header", () => {
    mockUsePatients.mockReturnValue([]);
    mockUsePatientStats.mockReturnValue({ active: 5 });
    render(<PatientsPage />);
    expect(screen.getByText("5 active patients")).toBeInTheDocument();
  });

  it("filters by search input", () => {
    const patients = [
      createMockPatient({ _id: "p1", firstName: "Alex", lastName: "Smith" }),
      createMockPatient({ _id: "p2", firstName: "Jordan", lastName: "Lee" }),
    ];
    mockUsePatients.mockReturnValue(patients);
    render(<PatientsPage />);

    const searchInput = screen.getByPlaceholderText("Search patients...");
    fireEvent.change(searchInput, { target: { value: "alex" } });

    expect(screen.getByText("Alex Smith")).toBeInTheDocument();
    expect(screen.queryByText("Jordan Lee")).not.toBeInTheDocument();
  });

  it("shows no-match message when search has no results", () => {
    mockUsePatients.mockReturnValue([
      createMockPatient({ _id: "p1", firstName: "Alex", lastName: "Smith" }),
    ]);
    render(<PatientsPage />);

    const searchInput = screen.getByPlaceholderText("Search patients...");
    fireEvent.change(searchInput, { target: { value: "zzzzz" } });

    expect(screen.getByText("No patients match your search")).toBeInTheDocument();
  });

  it("renders filter pills", () => {
    mockUsePatients.mockReturnValue([]);
    render(<PatientsPage />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("On Hold")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Discharged")).toBeInTheDocument();
  });

  it("passes status filter to usePatients when clicking filter pill", () => {
    mockUsePatients.mockReturnValue([]);
    render(<PatientsPage />);

    fireEvent.click(screen.getByText("Active"));
    expect(mockUsePatients).toHaveBeenCalledWith("active");
  });

  it("toggles expanded row on click", () => {
    const patient = createMockPatient({ _id: "p1" });
    mockUsePatients.mockReturnValue([patient]);
    render(<PatientsPage />);

    expect(screen.queryByTestId("expanded-p1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("patient-row-p1"));
    expect(screen.getByTestId("expanded-p1")).toBeInTheDocument();
  });

  it("has Add Patient button linking to /patients/new", () => {
    mockUsePatients.mockReturnValue([]);
    render(<PatientsPage />);
    const link = screen.getByText("Add Patient").closest("a");
    expect(link).toHaveAttribute("href", "/patients/new");
  });
});
