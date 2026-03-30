import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { type SoapNote,SoapPreview } from "../soap-preview";

vi.mock("@/core/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/shared/components/ui/textarea", () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock("@/shared/components/ui/badge", () => ({
  Badge: ({ children, ...props }: any) => (
    <span data-testid="badge" {...props}>{children}</span>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`} />
  ),
}));

const defaultSoap: SoapNote = {
  subjective: "Patient was cooperative and engaged.",
  objective: "Produced /r/ in initial position with 80% accuracy across 20 trials.",
  assessment: "Steady improvement in articulation goals.",
  plan: "Continue targeting /r/ blends next session.",
};

const defaultProps = {
  soapNote: defaultSoap,
  streamedText: "",
  status: "complete" as const,
  error: null,
  aiGenerated: true,
  onEdit: vi.fn(),
  onRegenerate: vi.fn(),
};

describe("SoapPreview", () => {
  it("renders idle placeholder when status is idle", () => {
    render(<SoapPreview {...defaultProps} status="idle" soapNote={null} />);
    expect(
      screen.getByText(/Fill in session data and click Generate SOAP Note/)
    ).toBeInTheDocument();
  });

  it("renders generating state with pulsing indicator", () => {
    render(
      <SoapPreview
        {...defaultProps}
        status="generating"
        soapNote={null}
        streamedText="Generating..."
      />
    );
    expect(screen.getByText("Generating SOAP note...")).toBeInTheDocument();
    expect(screen.getByText("Generating...")).toBeInTheDocument();
  });

  it("renders error state with error message", () => {
    render(
      <SoapPreview
        {...defaultProps}
        status="error"
        soapNote={null}
        error="Server timeout"
      />
    );
    expect(screen.getByText("Server timeout")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("renders default error message when error is null", () => {
    render(
      <SoapPreview
        {...defaultProps}
        status="error"
        soapNote={null}
        error={null}
      />
    );
    expect(screen.getByText("Failed to generate SOAP note")).toBeInTheDocument();
  });

  it("renders all 4 SOAP sections when complete", () => {
    render(<SoapPreview {...defaultProps} />);
    expect(screen.getByText("Subjective")).toBeInTheDocument();
    expect(screen.getByText("Objective")).toBeInTheDocument();
    expect(screen.getByText("Assessment")).toBeInTheDocument();
    expect(screen.getByText("Plan")).toBeInTheDocument();
  });

  it("displays section content", () => {
    render(<SoapPreview {...defaultProps} />);
    expect(
      screen.getByText("Patient was cooperative and engaged.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Produced \/r\/ in initial position/)
    ).toBeInTheDocument();
  });

  it("shows AI Generated badge when aiGenerated is true", () => {
    render(<SoapPreview {...defaultProps} />);
    expect(screen.getByText("AI Generated")).toBeInTheDocument();
  });

  it("shows SOAP Note heading", () => {
    render(<SoapPreview {...defaultProps} />);
    expect(screen.getByText("SOAP Note")).toBeInTheDocument();
  });

  it("shows Regenerate button when complete", () => {
    render(<SoapPreview {...defaultProps} />);
    expect(screen.getByText("Regenerate")).toBeInTheDocument();
  });
});
