import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuickNotes } from "../quick-notes";
import { createMockPatient } from "@/test/fixtures/patient-fixtures";

const mockMutate = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockMutate,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("QuickNotes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders textarea with existing notes", () => {
    const patient = createMockPatient({ notes: "Patient is progressing well" });
    render(<QuickNotes patient={patient as never} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("Patient is progressing well");
  });

  it("shows empty textarea when no notes", () => {
    const patient = createMockPatient({ notes: undefined });
    render(<QuickNotes patient={patient as never} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("");
  });

  it("calls mutation on blur with updated text", async () => {
    mockMutate.mockResolvedValue(undefined);
    const patient = createMockPatient({ notes: "" });
    render(<QuickNotes patient={patient as never} />);

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "New observation" } });
    fireEvent.blur(textarea);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        patientId: patient._id,
        notes: "New observation",
      });
    });
  });

  it("does not call mutation on blur when notes unchanged", () => {
    const patient = createMockPatient({ notes: "Existing notes" });
    render(<QuickNotes patient={patient as never} />);

    const textarea = screen.getByRole("textbox");
    fireEvent.blur(textarea);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("renders the Notes label", () => {
    const patient = createMockPatient();
    render(<QuickNotes patient={patient as never} />);
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });
});
