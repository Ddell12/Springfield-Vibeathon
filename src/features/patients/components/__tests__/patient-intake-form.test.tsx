import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { PatientIntakeForm } from "../patient-intake-form";

const mockMutate = vi.fn();
const mockPush = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockMutate,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="material-icon">{icon}</span>,
}));

// Mock Select — Radix portals don't work in jsdom
vi.mock("@/shared/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: { children: React.ReactNode; onValueChange: (v: string) => void; value: string }) => (
    <div data-testid="select-wrapper">
      <select
        data-testid="diagnosis-select"
        aria-label="Primary diagnosis"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="">Select diagnosis</option>
        <option value="articulation">Articulation</option>
        <option value="language">Language</option>
        <option value="fluency">Fluency</option>
        <option value="voice">Voice</option>
        <option value="aac-complex">AAC/Complex Communication</option>
        <option value="other">Other</option>
      </select>
    </div>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: () => null,
  SelectItem: () => null,
}));

describe("PatientIntakeForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders required fields", () => {
    render(<PatientIntakeForm />);
    expect(screen.getByLabelText("First name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last name")).toBeInTheDocument();
    expect(screen.getByLabelText("Date of birth")).toBeInTheDocument();
    // Diagnosis uses mocked Select with aria-label
    expect(screen.getByLabelText("Primary diagnosis")).toBeInTheDocument();
  });

  it("renders the page heading", () => {
    render(<PatientIntakeForm />);
    expect(screen.getByRole("heading", { name: "Add Patient" })).toBeInTheDocument();
  });

  it("shows validation errors for empty required fields on submit", async () => {
    render(<PatientIntakeForm />);
    const form = document.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("First name is required")).toBeInTheDocument();
      expect(screen.getByText("Last name is required")).toBeInTheDocument();
      expect(screen.getByText("Date of birth is required")).toBeInTheDocument();
      expect(screen.getByText("Diagnosis is required")).toBeInTheDocument();
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("calls mutation and shows success on valid submit", async () => {
    mockMutate.mockResolvedValue({ patientId: "patients_new" });

    render(<PatientIntakeForm />);

    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Maya" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Johnson" },
    });
    fireEvent.change(screen.getByLabelText("Date of birth"), {
      target: { value: "2020-01-15" },
    });
    fireEvent.change(screen.getByTestId("diagnosis-select"), {
      target: { value: "articulation" },
    });

    const form = document.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Maya",
          lastName: "Johnson",
          dateOfBirth: "2020-01-15",
          diagnosis: "articulation",
        })
      );
    });

    expect(toast.success).toHaveBeenCalledWith("Patient added to your caseload");
  });

  it("shows success screen after creation", async () => {
    mockMutate.mockResolvedValue({ patientId: "patients_new" });

    render(<PatientIntakeForm />);

    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Maya" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Johnson" },
    });
    fireEvent.change(screen.getByLabelText("Date of birth"), {
      target: { value: "2020-01-15" },
    });
    fireEvent.change(screen.getByTestId("diagnosis-select"), {
      target: { value: "language" },
    });

    const form = document.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Maya has been added")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "View Caseload" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Another" })).toBeInTheDocument();
  });
});
