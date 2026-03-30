import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SessionNotesList } from "../session-notes-list";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`} />
  ),
}));

const mockUseSessionNotes = vi.fn();
vi.mock("../../hooks/use-session-notes", () => ({
  useSessionNotes: (...args: any[]) => mockUseSessionNotes(...args),
}));

vi.mock("../session-note-card", () => ({
  SessionNoteCard: ({ note }: any) => (
    <div data-testid="session-note-card">{note._id}</div>
  ),
}));

describe("SessionNotesList", () => {
  it("shows loading state when data is undefined", () => {
    mockUseSessionNotes.mockReturnValue(undefined);
    render(<SessionNotesList patientId={"patient1" as any} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows empty state when notes array is empty", () => {
    mockUseSessionNotes.mockReturnValue([]);
    render(<SessionNotesList patientId={"patient1" as any} />);
    expect(screen.getByText("No sessions documented yet")).toBeInTheDocument();
    expect(screen.getByText("Document First Session")).toBeInTheDocument();
  });

  it("renders session note cards when data is available", () => {
    mockUseSessionNotes.mockReturnValue([
      { _id: "note1" },
      { _id: "note2" },
    ]);
    render(<SessionNotesList patientId={"patient1" as any} />);
    const cards = screen.getAllByTestId("session-note-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("note1");
    expect(cards[1]).toHaveTextContent("note2");
  });

  it("renders header with title and New Session button", () => {
    mockUseSessionNotes.mockReturnValue([]);
    render(<SessionNotesList patientId={"patient1" as any} />);
    expect(screen.getByText("Session Notes")).toBeInTheDocument();
    expect(screen.getByText("New Session")).toBeInTheDocument();
  });

  it("links New Session button to the correct path", () => {
    mockUseSessionNotes.mockReturnValue([]);
    render(<SessionNotesList patientId={"patient1" as any} />);
    const newLink = screen.getByText("New Session").closest("a");
    expect(newLink).toHaveAttribute("href", "/patients/patient1/sessions/new");
  });
});
