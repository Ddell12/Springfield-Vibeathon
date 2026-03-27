import { render, screen } from "@testing-library/react";
import type { Id } from "convex/_generated/dataModel";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { MyToolsPage } from "../my-tools-page";

// Mock convex/react — useQuery returns undefined (loading) by default
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

// Mock next/link as a plain anchor element
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock next/navigation router
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock material-icon to avoid font-loading issues
vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`} />
  ),
}));

// Mock ProjectCard (used after refactor to reusable card component)
vi.mock("@/features/dashboard/components/project-card", () => ({
  ProjectCard: ({ project, onDelete }: any) => (
    <div data-testid="project-card" data-id={project.id}>
      <span>{project.title}</span>
      {onDelete && <button onClick={onDelete}>Delete</button>}
      <a href={`/builder/${project.id}`}>Open</a>
    </div>
  ),
}));

// Mock DeleteConfirmationDialog
vi.mock("@/shared/components/delete-confirmation-dialog", () => ({
  DeleteConfirmationDialog: () => null,
}));

import * as convexReact from "convex/react";

const mockSession = {
  _id: "session1" as Id<"sessions">,
  _creationTime: Date.now(),
  title: "My Schedule",
  query: "Build a visual schedule",
  state: "complete" as const,
};

describe("MyToolsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());
  });

  test("shows loading skeleton when useQuery returns undefined", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);

    render(<MyToolsPage />);

    expect(screen.queryByText("My Schedule")).not.toBeInTheDocument();
    const loadingEl =
      screen.queryByRole("status") ||
      document.querySelector("[data-testid='loading-skeleton']") ||
      document.querySelector(".animate-pulse");
    expect(loadingEl).not.toBeNull();
  });

  test("shows empty state CTA when useQuery returns empty array", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([]);

    render(<MyToolsPage />);

    expect(
      screen.getByText(/no apps yet|create your first|get started/i),
    ).toBeInTheDocument();
  });

  test("renders session cards from the sessions table", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockSession]);

    render(<MyToolsPage />);

    expect(screen.getByText("My Schedule")).toBeInTheDocument();
  });

  test("renders ProjectCard with Open link for each session", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockSession]);

    render(<MyToolsPage />);

    const card = screen.getByTestId("project-card");
    expect(card).toBeInTheDocument();
    const openLink = screen.getByRole("link", { name: /open/i });
    expect(openLink).toHaveAttribute("href", `/builder/${mockSession._id}`);
  });

  test("renders ProjectCard with delete button", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockSession]);

    render(<MyToolsPage />);

    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  test("renders multiple session cards", () => {
    const sessions = [
      mockSession,
      { ...mockSession, _id: "session2" as Id<"sessions">, title: "Token Board" },
    ];
    vi.mocked(convexReact.useQuery).mockReturnValue(sessions);

    render(<MyToolsPage />);

    expect(screen.getByText("My Schedule")).toBeInTheDocument();
    expect(screen.getByText("Token Board")).toBeInTheDocument();
  });
});
