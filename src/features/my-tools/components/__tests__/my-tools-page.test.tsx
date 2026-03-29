import { fireEvent, render, screen, act } from "@testing-library/react";
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

vi.mock("@/core/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) => {
    const { ref, ...rest } = props;
    return <input {...rest} />;
  },
}));

// Mock ProjectCard (used after refactor to reusable card component)
vi.mock("@/shared/components/project-card", () => ({
  ProjectCard: ({ project, onDelete, onRename, onDuplicate }: any) => (
    <div data-testid="project-card" data-id={project.id}>
      <span>{project.title}</span>
      {onDelete && <button onClick={onDelete}>Delete</button>}
      {onRename && <button onClick={onRename}>Rename</button>}
      {onDuplicate && <button onClick={onDuplicate}>Duplicate</button>}
      <a href={`/builder/${project.id}`}>Open</a>
    </div>
  ),
}));

// Mock DeleteConfirmationDialog
vi.mock("@/shared/components/delete-confirmation-dialog", () => ({
  DeleteConfirmationDialog: ({ open, onConfirmDelete }: any) =>
    open ? (
      <div data-testid="delete-dialog">
        <button onClick={onConfirmDelete}>Confirm Delete</button>
      </div>
    ) : null,
}));

import * as convexReact from "convex/react";

const mockSession = {
  _id: "session1" as Id<"sessions">,
  _creationTime: Date.now(),
  title: "My Schedule",
  query: "Build a visual schedule",
  state: "complete" as const,
};

const mockSession2 = {
  _id: "session2" as Id<"sessions">,
  _creationTime: Date.now() - 10000,
  title: "Token Board",
  query: "Build a token board",
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

  test("empty state has link to builder", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([]);

    render(<MyToolsPage />);

    const buildLink = screen.getByRole("link", { name: /start building/i });
    expect(buildLink).toHaveAttribute("href", "/builder");
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

  test("renders ProjectCard with rename button", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockSession]);

    render(<MyToolsPage />);

    expect(screen.getByRole("button", { name: /rename/i })).toBeInTheDocument();
  });

  test("renders ProjectCard with duplicate button", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockSession]);

    render(<MyToolsPage />);

    expect(screen.getByRole("button", { name: /duplicate/i })).toBeInTheDocument();
  });

  test("renders multiple session cards", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockSession, mockSession2]);

    render(<MyToolsPage />);

    expect(screen.getByText("My Schedule")).toBeInTheDocument();
    expect(screen.getByText("Token Board")).toBeInTheDocument();
  });

  test("search filters apps by title", async () => {
    vi.useFakeTimers();
    vi.mocked(convexReact.useQuery).mockReturnValue([mockSession, mockSession2]);

    render(<MyToolsPage />);

    const searchInput = screen.getByLabelText(/search apps/i);
    fireEvent.change(searchInput, { target: { value: "Token" } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("Token Board")).toBeInTheDocument();
    expect(screen.queryByText("My Schedule")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  test("shows no search results message", async () => {
    vi.useFakeTimers();
    vi.mocked(convexReact.useQuery).mockReturnValue([mockSession]);

    render(<MyToolsPage />);

    const searchInput = screen.getByLabelText(/search apps/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByTestId("no-search-results")).toBeInTheDocument();

    vi.useRealTimers();
  });

  test("delete button opens confirmation dialog", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockSession]);

    render(<MyToolsPage />);

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
  });

  test("renders search input", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockSession]);

    render(<MyToolsPage />);

    expect(screen.getByLabelText(/search apps/i)).toBeInTheDocument();
  });

  test("renders sort toggle buttons", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockSession]);

    render(<MyToolsPage />);

    expect(screen.getByRole("button", { name: /last edited/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /a–z/i })).toBeInTheDocument();
  });

  test("sort by alphabetical changes order", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockSession, mockSession2]);

    render(<MyToolsPage />);

    const alphaButton = screen.getByRole("button", { name: /a–z/i });
    fireEvent.click(alphaButton);

    const cards = screen.getAllByTestId("project-card");
    // "My Schedule" < "Token Board" alphabetically
    expect(cards[0]).toHaveTextContent("My Schedule");
    expect(cards[1]).toHaveTextContent("Token Board");
  });
});
