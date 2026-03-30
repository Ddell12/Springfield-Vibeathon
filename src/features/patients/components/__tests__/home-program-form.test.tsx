import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HomeProgramForm } from "../home-program-form";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";

const mockMutate = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockMutate,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock shadcn Select as a native <select> so fireEvent.change works in tests
vi.mock("@/shared/components/ui/select", () => {
  const React = require("react");
  const SelectContext = React.createContext<{ onValueChange?: (v: string) => void }>({});
  return {
    Select: ({ children, value, onValueChange }: any) => (
      <SelectContext.Provider value={{ onValueChange }}>
        <select
          value={value ?? ""}
          onChange={(e: any) => onValueChange?.(e.target.value)}
          aria-label="Frequency"
        >
          <option value="" disabled>Select frequency</option>
          {children}
        </select>
      </SelectContext.Provider>
    ),
    SelectTrigger: ({ children }: any) => <>{children}</>,
    SelectValue: () => null,
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  };
});

describe("HomeProgramForm", () => {
  const patientId = "patients_1" as Id<"patients">;
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    patientId,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows dialog when open=true", () => {
    render(<HomeProgramForm {...defaultProps} />);
    expect(screen.getByText("Assign Home Program")).toBeInTheDocument();
  });

  it("hides dialog when open=false", () => {
    render(<HomeProgramForm {...defaultProps} open={false} />);
    expect(screen.queryByText("Assign Home Program")).not.toBeInTheDocument();
  });

  it("has title, instructions, and frequency fields", () => {
    render(<HomeProgramForm {...defaultProps} />);
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Instructions")).toBeInTheDocument();
    expect(screen.getByLabelText("Frequency")).toBeInTheDocument();
  });

  it("shows validation error for empty title", async () => {
    render(<HomeProgramForm {...defaultProps} />);
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Title is required");
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows validation error for empty instructions", async () => {
    render(<HomeProgramForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Morning warm-up" },
    });

    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Instructions are required");
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows validation error for empty frequency", async () => {
    render(<HomeProgramForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Morning warm-up" },
    });
    fireEvent.change(screen.getByLabelText("Instructions"), {
      target: { value: "Practice /s/ sounds" },
    });

    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Frequency is required");
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("submits with correct args when all fields filled", async () => {
    mockMutate.mockResolvedValue(undefined);
    render(<HomeProgramForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Morning warm-up" },
    });
    fireEvent.change(screen.getByLabelText("Instructions"), {
      target: { value: "Practice /s/ sounds" },
    });
    fireEvent.change(screen.getByLabelText("Frequency"), {
      target: { value: "daily" },
    });

    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId,
          title: "Morning warm-up",
          instructions: "Practice /s/ sounds",
          frequency: "daily",
        })
      );
    });

    expect(toast.success).toHaveBeenCalledWith("Home program assigned");
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});
