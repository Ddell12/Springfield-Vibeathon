import { render, screen } from "@testing-library/react";

import { createMockPatient } from "@/test/fixtures/patient-fixtures";

import { PatientProfileWidget } from "../patient-profile-widget";

const mockMutate = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockMutate,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="material-icon">{icon}</span>,
}));

describe("PatientProfileWidget", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders patient name", () => {
    const patient = createMockPatient({ firstName: "Maya", lastName: "Johnson" });
    render(<PatientProfileWidget patient={patient as never} />);
    expect(screen.getByText("Maya Johnson")).toBeInTheDocument();
  });

  it("renders age from date of birth", () => {
    const patient = createMockPatient({ dateOfBirth: "2020-06-15" });
    render(<PatientProfileWidget patient={patient as never} />);
    // formatAge returns something like "5y 9mo old" — just check "old" suffix is present
    expect(screen.getByText(/old$/)).toBeInTheDocument();
  });

  it("renders diagnosis badge", () => {
    const patient = createMockPatient({ diagnosis: "articulation" });
    render(<PatientProfileWidget patient={patient as never} />);
    expect(screen.getByLabelText("Diagnosis: Articulation")).toBeInTheDocument();
  });

  it("renders interests tags when present", () => {
    const patient = createMockPatient({ interests: ["dinosaurs", "trains"] });
    render(<PatientProfileWidget patient={patient as never} />);
    expect(screen.getByText("dinosaurs")).toBeInTheDocument();
    expect(screen.getByText("trains")).toBeInTheDocument();
  });

  it("shows empty interests state when no interests", () => {
    const patient = createMockPatient({ interests: [] });
    render(<PatientProfileWidget patient={patient as never} />);
    expect(screen.getByText("No interests added yet")).toBeInTheDocument();
  });

  it("shows empty interests state when interests is undefined", () => {
    const patient = createMockPatient({ interests: undefined });
    render(<PatientProfileWidget patient={patient as never} />);
    expect(screen.getByText("No interests added yet")).toBeInTheDocument();
  });

  it("renders initials from patient name", () => {
    const patient = createMockPatient({ firstName: "Maya", lastName: "Johnson" });
    render(<PatientProfileWidget patient={patient as never} />);
    expect(screen.getByText("MJ")).toBeInTheDocument();
  });
});
