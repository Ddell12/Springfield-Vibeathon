import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StructuredDataForm } from "../structured-data-form";

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/shared/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/shared/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock("@/shared/components/ui/textarea", () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock("@/shared/components/ui/radio-group", () => ({
  RadioGroup: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  RadioGroupItem: (props: any) => <input type="radio" {...props} />,
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`} />
  ),
}));

vi.mock("@/shared/clinical", () => ({
  formatAge: vi.fn((dob: string) => "5y 2m"),
  useActiveGoals: vi.fn(() => []),
}));

vi.mock("../target-entry", () => ({
  TargetEntry: ({ data }: any) => (
    <div data-testid="target-entry">{data.target}</div>
  ),
}));

vi.mock("../duration-preset-input", () => ({
  DurationPresetInput: ({ value, onChange, disabled }: any) => (
    <input
      data-testid="duration-input"
      type="number"
      value={value}
      onChange={(e: any) => onChange(Number(e.target.value))}
      disabled={disabled}
    />
  ),
}));

vi.mock("@/shared/lib/diagnosis", () => ({
  DIAGNOSIS_LABELS: {
    articulation: "Articulation",
    language: "Language",
  },
}));

const mockPatient = {
  _id: "patient1" as any,
  _creationTime: Date.now(),
  userId: "user1",
  firstName: "Alex",
  lastName: "Johnson",
  dateOfBirth: "2021-01-15",
  diagnosis: "articulation",
} as any;

const defaultProps = {
  patient: mockPatient,
  sessionDate: "2026-03-15",
  sessionDuration: 30,
  sessionType: "in-person" as const,
  structuredData: {
    targetsWorkedOn: [{ target: "Initial /r/" }],
  },
  onSessionDateChange: vi.fn(),
  onSessionDurationChange: vi.fn(),
  onSessionTypeChange: vi.fn(),
  onStructuredDataChange: vi.fn(),
};

describe("StructuredDataForm", () => {
  it("renders patient context with name", () => {
    render(<StructuredDataForm {...defaultProps} />);
    expect(screen.getByText("Alex Johnson")).toBeInTheDocument();
  });

  it("renders patient age using formatAge", () => {
    render(<StructuredDataForm {...defaultProps} />);
    expect(screen.getByText("Age: 5y 2m")).toBeInTheDocument();
  });

  it("renders diagnosis label", () => {
    render(<StructuredDataForm {...defaultProps} />);
    expect(screen.getByText("Articulation")).toBeInTheDocument();
  });

  it("renders target entries", () => {
    render(<StructuredDataForm {...defaultProps} />);
    const entries = screen.getAllByTestId("target-entry");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toHaveTextContent("Initial /r/");
  });

  it("renders duration input with value", () => {
    render(<StructuredDataForm {...defaultProps} />);
    expect(screen.getByTestId("duration-input")).toHaveValue(30);
  });

  it("renders session type radio options", () => {
    render(<StructuredDataForm {...defaultProps} />);
    expect(screen.getByText("In-Person")).toBeInTheDocument();
    expect(screen.getByText("Teletherapy")).toBeInTheDocument();
    expect(screen.getByText("Parent Consultation")).toBeInTheDocument();
  });

  it("renders Section Details heading", () => {
    render(<StructuredDataForm {...defaultProps} />);
    expect(screen.getByText("Session Details")).toBeInTheDocument();
  });

  it("renders Additional Notes section with textarea fields", () => {
    render(<StructuredDataForm {...defaultProps} />);
    expect(screen.getByText("Behavior Notes")).toBeInTheDocument();
    expect(screen.getByText("Parent Feedback")).toBeInTheDocument();
    expect(screen.getByText("Homework Assigned")).toBeInTheDocument();
    expect(screen.getByText("Next Session Focus")).toBeInTheDocument();
  });

  it("shows empty targets message when no targets", () => {
    render(
      <StructuredDataForm
        {...defaultProps}
        structuredData={{ targetsWorkedOn: [] }}
      />
    );
    expect(
      screen.getByText(/No targets added yet/)
    ).toBeInTheDocument();
  });

  it("renders Add Target button", () => {
    render(<StructuredDataForm {...defaultProps} />);
    expect(screen.getByText("Add Target")).toBeInTheDocument();
  });
});
