import { render, screen, fireEvent } from "@testing-library/react";
import { PatientRow } from "../patient-row";
import { createMockPatient } from "@/test/fixtures/patient-fixtures";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="material-icon">{icon}</span>,
}));

describe("PatientRow", () => {
  const defaultPatient = createMockPatient();
  const onToggle = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders patient name", () => {
    render(
      <PatientRow patient={defaultPatient} isExpanded={false} onToggle={onToggle} />
    );
    expect(screen.getByText("Alex Smith")).toBeInTheDocument();
  });

  it("renders formatted age from date of birth", () => {
    render(
      <PatientRow patient={defaultPatient} isExpanded={false} onToggle={onToggle} />
    );
    // dateOfBirth is "2020-06-15", so age text should contain "y" (years)
    const ageElement = screen.getByText(/\d+y/);
    expect(ageElement).toBeInTheDocument();
  });

  it("renders initials avatar", () => {
    render(
      <PatientRow patient={defaultPatient} isExpanded={false} onToggle={onToggle} />
    );
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("renders diagnosis chip with correct label", () => {
    render(
      <PatientRow patient={defaultPatient} isExpanded={false} onToggle={onToggle} />
    );
    expect(screen.getByLabelText(/Diagnosis:/)).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(
      <PatientRow patient={defaultPatient} isExpanded={false} onToggle={onToggle} />
    );
    expect(screen.getByLabelText("Status: Active")).toBeInTheDocument();
  });

  it("renders expand_more icon when collapsed", () => {
    render(
      <PatientRow patient={defaultPatient} isExpanded={false} onToggle={onToggle} />
    );
    expect(screen.getByText("expand_more")).toBeInTheDocument();
  });

  it("renders expand_less icon when expanded", () => {
    render(
      <PatientRow patient={defaultPatient} isExpanded={true} onToggle={onToggle} />
    );
    expect(screen.getByText("expand_less")).toBeInTheDocument();
  });

  it("sets aria-expanded correctly", () => {
    const { rerender } = render(
      <PatientRow patient={defaultPatient} isExpanded={false} onToggle={onToggle} />
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");

    rerender(
      <PatientRow patient={defaultPatient} isExpanded={true} onToggle={onToggle} />
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("calls onToggle when clicked", () => {
    render(
      <PatientRow patient={defaultPatient} isExpanded={false} onToggle={onToggle} />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders on-hold status for patients with on-hold status", () => {
    const patient = createMockPatient({ status: "on-hold" });
    render(
      <PatientRow patient={patient} isExpanded={false} onToggle={onToggle} />
    );
    expect(screen.getByLabelText("Status: On Hold")).toBeInTheDocument();
  });
});
