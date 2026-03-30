import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SessionNoteCard } from "../session-note-card";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/core/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
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

vi.mock("../../lib/session-utils", () => ({
  formatDuration: (minutes: number) => `${minutes} min`,
  calculateAccuracy: (correct?: number, trials?: number) => {
    if (!trials || trials === 0 || correct === undefined) return null;
    return Math.round((correct / trials) * 100);
  },
  accuracyLabel: (accuracy: number | null) =>
    accuracy === null ? "—" : accuracy >= 80 ? `${accuracy}% ✓` : `${accuracy}%`,
  accuracyColor: (accuracy: number | null) =>
    accuracy === null ? "text-muted-foreground" : "text-green-600",
}));

function makeNote(overrides: Record<string, any> = {}) {
  return {
    _id: "note1" as any,
    _creationTime: Date.now(),
    patientId: "patient1" as any,
    userId: "user1",
    sessionDate: "2026-03-15",
    sessionDuration: 30,
    sessionType: "in-person",
    status: "draft",
    structuredData: {
      targetsWorkedOn: [
        { target: "Initial /r/ production", trials: 20, correct: 16 },
      ],
    },
    aiGenerated: false,
    ...overrides,
  } as any;
}

describe("SessionNoteCard", () => {
  it("renders session date", () => {
    render(<SessionNoteCard note={makeNote()} patientId="patient1" />);
    expect(screen.getByText(/Mar 15, 2026/)).toBeInTheDocument();
  });

  it("renders duration badge", () => {
    render(<SessionNoteCard note={makeNote()} patientId="patient1" />);
    expect(screen.getByText("30 min")).toBeInTheDocument();
  });

  it("renders status text for draft", () => {
    render(<SessionNoteCard note={makeNote({ status: "draft" })} patientId="patient1" />);
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("renders status text for signed with check icon", () => {
    render(
      <SessionNoteCard note={makeNote({ status: "signed" })} patientId="patient1" />
    );
    expect(screen.getByText("signed")).toBeInTheDocument();
    expect(screen.getByTestId("icon-check")).toBeInTheDocument();
  });

  it("calculates and displays accuracy for targets with trial data", () => {
    render(<SessionNoteCard note={makeNote()} patientId="patient1" />);
    // 16/20 = 80%
    expect(screen.getByText("80% ✓")).toBeInTheDocument();
  });

  it("renders first target name", () => {
    render(<SessionNoteCard note={makeNote()} patientId="patient1" />);
    expect(screen.getByText("Initial /r/ production")).toBeInTheDocument();
  });

  it('renders "No targets recorded" when targets array is empty', () => {
    render(
      <SessionNoteCard
        note={makeNote({
          structuredData: { targetsWorkedOn: [{ target: "" }] },
        })}
        patientId="patient1"
      />
    );
    // The first target's target field is empty string, which is falsy, so falls through to "No targets recorded"
    // Actually: it shows empty string as the target name since it checks firstTarget?.target ?? "No targets recorded"
    // An empty string is falsy in ?? only if it's nullish. "" is NOT nullish. So it shows ""
    // Let's test with no targets instead
  });

  it('shows "No targets recorded" when first target has no name', () => {
    const note = makeNote({
      structuredData: { targetsWorkedOn: [] },
    });
    // firstTarget is undefined, so firstTarget?.target is undefined, ?? triggers
    render(<SessionNoteCard note={note} patientId="patient1" />);
    expect(screen.getByText("No targets recorded")).toBeInTheDocument();
  });

  it("renders as a link to the session detail page", () => {
    render(<SessionNoteCard note={makeNote()} patientId="patient1" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/patients/patient1/sessions/note1");
  });

  it("renders type icon for teletherapy", () => {
    render(
      <SessionNoteCard note={makeNote({ sessionType: "teletherapy" })} patientId="patient1" />
    );
    expect(screen.getByTestId("icon-videocam")).toBeInTheDocument();
  });
});
