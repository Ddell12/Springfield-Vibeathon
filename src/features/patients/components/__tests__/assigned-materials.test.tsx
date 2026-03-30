import { render, screen } from "@testing-library/react";

import type { Id } from "../../../../../convex/_generated/dataModel";
import { AssignedMaterials } from "../assigned-materials";

const mockUsePatientMaterials = vi.fn();

vi.mock("../../hooks/use-patients", () => ({
  usePatientMaterials: (...args: unknown[]) => mockUsePatientMaterials(...args),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="material-icon">{icon}</span>,
}));

describe("AssignedMaterials", () => {
  const patientId = "patients_1" as Id<"patients">;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state when data is undefined", () => {
    mockUsePatientMaterials.mockReturnValue(undefined);
    render(<AssignedMaterials patientId={patientId} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows empty state with build link when no materials", () => {
    mockUsePatientMaterials.mockReturnValue([]);
    render(<AssignedMaterials patientId={patientId} />);
    expect(screen.getByText("No materials assigned yet")).toBeInTheDocument();
    expect(screen.getByText("Build one")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/builder");
  });

  it("renders the section heading", () => {
    mockUsePatientMaterials.mockReturnValue([]);
    render(<AssignedMaterials patientId={patientId} />);
    expect(screen.getByText("Assigned Materials")).toBeInTheDocument();
  });

  it("renders material entries with title and type", () => {
    mockUsePatientMaterials.mockReturnValue([
      {
        _id: "patientMaterials_1" as Id<"patientMaterials">,
        title: "Articulation Cards",
        type: "app",
        notes: null,
      },
    ]);
    render(<AssignedMaterials patientId={patientId} />);
    expect(screen.getByText("Articulation Cards")).toBeInTheDocument();
    expect(screen.getByText("app")).toBeInTheDocument();
  });

  it("renders notes when present", () => {
    mockUsePatientMaterials.mockReturnValue([
      {
        _id: "patientMaterials_1" as Id<"patientMaterials">,
        title: "Flashcards",
        type: "app",
        notes: "Focus on /s/ sounds",
      },
    ]);
    render(<AssignedMaterials patientId={patientId} />);
    expect(screen.getByText("Focus on /s/ sounds")).toBeInTheDocument();
  });

  it("does not render notes element when notes is falsy", () => {
    mockUsePatientMaterials.mockReturnValue([
      {
        _id: "patientMaterials_1" as Id<"patientMaterials">,
        title: "Flashcards",
        type: "app",
        notes: undefined,
      },
    ]);
    render(<AssignedMaterials patientId={patientId} />);
    expect(screen.getByText("Flashcards")).toBeInTheDocument();
    // Only the title and type text should be present, no extra paragraph
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
  });

  it("renders multiple materials", () => {
    mockUsePatientMaterials.mockReturnValue([
      {
        _id: "patientMaterials_1" as Id<"patientMaterials">,
        title: "Articulation Cards",
        type: "app",
        notes: null,
      },
      {
        _id: "patientMaterials_2" as Id<"patientMaterials">,
        title: "Social Story",
        type: "resource",
        notes: "For transitions",
      },
    ]);
    render(<AssignedMaterials patientId={patientId} />);
    expect(screen.getByText("Articulation Cards")).toBeInTheDocument();
    expect(screen.getByText("Social Story")).toBeInTheDocument();
    expect(screen.getByText("For transitions")).toBeInTheDocument();
  });

  it("passes patientId to the hook", () => {
    mockUsePatientMaterials.mockReturnValue(undefined);
    render(<AssignedMaterials patientId={patientId} />);
    expect(mockUsePatientMaterials).toHaveBeenCalledWith(patientId);
  });
});
