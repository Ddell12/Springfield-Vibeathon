import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionNoteEditor } from "../session-note-editor";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  notFound: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`} />
  ),
}));

const mockUsePatient = vi.fn();
vi.mock("@/shared/clinical", () => ({
  usePatient: (...args: any[]) => mockUsePatient(...args),
}));

const mockUseSessionNote = vi.fn();
const mockUseCreateSessionNote = vi.fn(() => vi.fn());
const mockUseUpdateSessionNote = vi.fn(() => vi.fn());
const mockUseUpdateSoap = vi.fn(() => vi.fn());
const mockUseUpdateSessionNoteStatus = vi.fn(() => vi.fn());
const mockUseSignSessionNote = vi.fn(() => vi.fn());
const mockUseUnsignSessionNote = vi.fn(() => vi.fn());

vi.mock("../../hooks/use-session-notes", () => ({
  useSessionNote: (...args: any[]) => mockUseSessionNote(...args),
  useCreateSessionNote: () => mockUseCreateSessionNote(),
  useUpdateSessionNote: () => mockUseUpdateSessionNote(),
  useUpdateSoap: () => mockUseUpdateSoap(),
  useUpdateSessionNoteStatus: () => mockUseUpdateSessionNoteStatus(),
  useSignSessionNote: () => mockUseSignSessionNote(),
  useUnsignSessionNote: () => mockUseUnsignSessionNote(),
}));

vi.mock("../../hooks/use-soap-generation", () => ({
  useSoapGeneration: () => ({
    soapNote: null,
    streamedText: "",
    status: "idle",
    error: null,
    generate: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("../structured-data-form", () => ({
  StructuredDataForm: (props: any) => (
    <div data-testid="structured-data-form">StructuredDataForm</div>
  ),
}));

vi.mock("../soap-preview", () => ({
  SoapPreview: (props: any) => (
    <div data-testid="soap-preview">SoapPreview</div>
  ),
}));

describe("SessionNoteEditor", () => {
  it("shows loading state when patient is undefined", () => {
    mockUsePatient.mockReturnValue(undefined);
    mockUseSessionNote.mockReturnValue(undefined);
    render(<SessionNoteEditor patientId="patient1" />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders editor layout with patient loaded", () => {
    mockUsePatient.mockReturnValue({
      _id: "patient1",
      firstName: "Alex",
      lastName: "Johnson",
      dateOfBirth: "2021-01-15",
      diagnosis: "articulation",
    });
    mockUseSessionNote.mockReturnValue(undefined);
    render(<SessionNoteEditor patientId="patient1" />);
    expect(screen.getByText("New Session Note")).toBeInTheDocument();
    expect(screen.getByText("Back to patient")).toBeInTheDocument();
  });

  it("renders child components (StructuredDataForm and SoapPreview)", () => {
    mockUsePatient.mockReturnValue({
      _id: "patient1",
      firstName: "Alex",
      lastName: "Johnson",
      dateOfBirth: "2021-01-15",
      diagnosis: "articulation",
    });
    mockUseSessionNote.mockReturnValue(undefined);
    render(<SessionNoteEditor patientId="patient1" />);
    expect(screen.getByTestId("structured-data-form")).toBeInTheDocument();
    expect(screen.getByTestId("soap-preview")).toBeInTheDocument();
  });

  it("shows Edit Session Note when noteId is provided", () => {
    mockUsePatient.mockReturnValue({
      _id: "patient1",
      firstName: "Alex",
      lastName: "Johnson",
      dateOfBirth: "2021-01-15",
      diagnosis: "articulation",
    });
    mockUseSessionNote.mockReturnValue({
      _id: "note1",
      status: "draft",
      sessionDate: "2026-03-15",
      sessionDuration: 30,
      sessionType: "in-person",
      structuredData: { targetsWorkedOn: [{ target: "" }] },
    });
    render(<SessionNoteEditor patientId="patient1" noteId="note1" />);
    expect(screen.getByText("Edit Session Note")).toBeInTheDocument();
  });

  it("renders Generate SOAP Note button", () => {
    mockUsePatient.mockReturnValue({
      _id: "patient1",
      firstName: "Alex",
      lastName: "Johnson",
      dateOfBirth: "2021-01-15",
      diagnosis: "articulation",
    });
    mockUseSessionNote.mockReturnValue(undefined);
    render(<SessionNoteEditor patientId="patient1" />);
    expect(screen.getByText("Generate SOAP Note")).toBeInTheDocument();
  });

  it("renders Back to patient link with correct href", () => {
    mockUsePatient.mockReturnValue({
      _id: "patient1",
      firstName: "Alex",
      lastName: "Johnson",
      dateOfBirth: "2021-01-15",
      diagnosis: "articulation",
    });
    mockUseSessionNote.mockReturnValue(undefined);
    render(<SessionNoteEditor patientId="patient1" />);
    const backLink = screen.getByText("Back to patient").closest("a");
    expect(backLink).toHaveAttribute("href", "/patients/patient1");
  });
});
