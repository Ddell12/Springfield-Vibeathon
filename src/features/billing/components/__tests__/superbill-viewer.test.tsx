import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn((fn: unknown, args: unknown) => {
    if (args && typeof args === "object" && "recordId" in args) {
      return {
        _id: "record-1",
        patientId: "patient-1",
        slpUserId: "slp-1",
        sessionNoteId: "note-1",
        dateOfService: "2026-03-28",
        cptCode: "92507",
        cptDescription: "Individual speech/language/voice treatment",
        modifiers: ["GP"],
        diagnosisCodes: [{ code: "F80.0", description: "Phonological disorder" }],
        placeOfService: "11",
        units: 1,
        fee: 15000,
        status: "finalized",
      };
    }
    if (args && typeof args === "object" && "patientId" in args) {
      return {
        _id: "patient-1",
        firstName: "Alex",
        lastName: "Smith",
        dateOfBirth: "2020-01-15",
        insuranceCarrier: "BCBS",
        insuranceMemberId: "BCB123",
      };
    }
    return {
      practiceName: "Springfield Speech",
      npiNumber: "1234567890",
      address: "123 Main St",
      phone: "217-555-0100",
      credentials: "CCC-SLP",
    };
  }),
}));

vi.mock("@/shared/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

import { SuperbillViewer } from "../superbill-viewer";

describe("SuperbillViewer", () => {
  it("renders practice name and patient name", () => {
    render(
      <SuperbillViewer
        recordId={"record-1" as any}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Springfield Speech")).toBeInTheDocument();
    expect(screen.getByText(/Alex Smith/)).toBeInTheDocument();
  });

  it("renders CPT code and fee", () => {
    render(
      <SuperbillViewer
        recordId={"record-1" as any}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText("92507")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
  });

  it("renders Print / Save as PDF button", () => {
    render(
      <SuperbillViewer
        recordId={"record-1" as any}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /print/i })).toBeInTheDocument();
  });
});
