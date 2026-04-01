import { act,fireEvent, render, screen } from "@testing-library/react";
import type { Id } from "convex/_generated/dataModel";
import { beforeEach, describe, expect, it, test, vi } from "vitest";

import { MyToolsPage } from "../my-tools-page";

let searchParams = new URLSearchParams();

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
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => searchParams,
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

vi.mock("@/core/routes", () => ({
  ROUTES: {
    TOOLS_EDIT: (id: string) => `/tools/${id}`,
  },
}));

vi.mock("@/shared/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) => {
    const { ref, ...rest } = props;
    return <input {...rest} />;
  },
}));

// Mock ProjectCard — accept and render href prop
vi.mock("@/shared/components/project-card", () => ({
  ProjectCard: ({ project, href, onDelete, onRename, onDuplicate }: any) => (
    <div data-testid="project-card" data-id={project.id}>
      <a href={href ?? `/tools/${project.id}`}>{project.title}</a>
      {onDelete && <button onClick={onDelete}>Delete</button>}
      {onRename && <button onClick={onRename}>Rename</button>}
      {onDuplicate && <button onClick={onDuplicate}>Duplicate</button>}
    </div>
  ),
}));

// Mock ToggleGroup — propagate onValueChange when items are clicked
vi.mock("@/shared/components/ui/toggle-group", () => {
  let _onValueChange: ((v: string) => void) | undefined;
  return {
    ToggleGroup: ({ children, onValueChange }: any) => {
      _onValueChange = onValueChange;
      return <div data-testid="toggle-group">{children}</div>;
    },
    ToggleGroupItem: ({ children, value, ...props }: any) => (
      <button
        role="button"
        data-value={value}
        onClick={() => _onValueChange?.(value)}
        {...props}
      >
        {children}
      </button>
    ),
  };
});

// Mock DeleteConfirmationDialog
vi.mock("@/shared/components/delete-confirmation-dialog", () => ({
  DeleteConfirmationDialog: ({ open, onConfirmDelete }: any) =>
    open ? (
      <div data-testid="delete-dialog">
        <button onClick={onConfirmDelete}>Confirm Delete</button>
      </div>
    ) : null,
}));

// Mock DuplicateToolDialog
vi.mock("@/features/tools/components/builder/duplicate-tool-dialog", () => ({
  DuplicateToolDialog: ({ open }: any) =>
    open ? <div data-testid="duplicate-dialog" /> : null,
}));

import * as convexReact from "convex/react";

const mockUseQuery = vi.mocked(convexReact.useQuery);

const mockTool = {
  _id: "inst-1" as Id<"app_instances">,
  _creationTime: Date.now(),
  title: "My Schedule",
  templateType: "visual_schedule",
  patientId: "patient-1" as Id<"patients">,
  slpUserId: "user-1",
  configJson: "{}",
  status: "draft" as const,
  version: 1,
};

const mockTool2 = {
  _id: "inst-2" as Id<"app_instances">,
  _creationTime: Date.now() - 10000,
  title: "Token Board",
  templateType: "token_board",
  patientId: "patient-1" as Id<"patients">,
  slpUserId: "user-1",
  configJson: "{}",
  status: "draft" as const,
  version: 1,
};

describe("MyToolsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());
    searchParams = new URLSearchParams();
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

  test("empty state has link to /tools/new", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([]);

    render(<MyToolsPage />);

    const buildLink = screen.getByRole("link", { name: /create a tool/i });
    expect(buildLink).toHaveAttribute("href", "/tools/new");
  });

  test("renders tool cards from app_instances", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool]);

    render(<MyToolsPage />);

    expect(screen.getByText("My Schedule")).toBeInTheDocument();
  });

  test("renders ProjectCard linking to /tools/[id] for editing", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool]);

    render(<MyToolsPage />);

    const card = screen.getByTestId("project-card");
    expect(card).toBeInTheDocument();
    const editLink = screen.getByRole("link", { name: "My Schedule" });
    expect(editLink).toHaveAttribute("href", `/tools/${mockTool._id}`);
  });

  test("renders ProjectCard with delete button", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool]);

    render(<MyToolsPage />);

    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  test("renders ProjectCard with rename button", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool]);

    render(<MyToolsPage />);

    expect(screen.getByRole("button", { name: /rename/i })).toBeInTheDocument();
  });

  test("renders ProjectCard with duplicate button", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool]);

    render(<MyToolsPage />);

    expect(screen.getByRole("button", { name: /duplicate/i })).toBeInTheDocument();
  });

  test("renders multiple tool cards", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool, mockTool2]);

    render(<MyToolsPage />);

    expect(screen.getByText("My Schedule")).toBeInTheDocument();
    expect(screen.getByText("Token Board")).toBeInTheDocument();
  });

  test("filters out archived tools", () => {
    const archivedTool = { ...mockTool, _id: "inst-3" as Id<"app_instances">, title: "Archived", status: "archived" as const };
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool, archivedTool]);

    render(<MyToolsPage />);

    expect(screen.getByText("My Schedule")).toBeInTheDocument();
    expect(screen.queryByText("Archived")).not.toBeInTheDocument();
  });

  test("slices tool cards by the page query param", () => {
    searchParams = new URLSearchParams("page=2");
    const pagedTools = Array.from({ length: 13 }, (_, i) => ({
      _id: `inst-${i + 1}` as Id<"app_instances">,
      _creationTime: Date.now() - i * 1000,
      title: `App ${i + 1}`,
      templateType: "aac_board",
      patientId: "patient-1" as Id<"patients">,
      slpUserId: "user-1",
      configJson: "{}",
      status: "draft" as const,
      version: 1,
    }));
    vi.mocked(convexReact.useQuery).mockReturnValue(pagedTools);

    render(<MyToolsPage />);

    expect(screen.getAllByTestId("project-card")).toHaveLength(1);
    expect(screen.getByText("App 13")).toBeInTheDocument();
  });

  test("search filters apps by title", async () => {
    vi.useFakeTimers();
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool, mockTool2]);

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
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool]);

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
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool]);

    render(<MyToolsPage />);

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
  });

  test("renders search input", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool]);

    render(<MyToolsPage />);

    expect(screen.getByLabelText(/search apps/i)).toBeInTheDocument();
  });

  test("renders sort toggle buttons", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool]);

    render(<MyToolsPage />);

    expect(screen.getByRole("button", { name: /last edited/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /a–z/i })).toBeInTheDocument();
  });

  test("sort by alphabetical changes order", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool, mockTool2]);

    render(<MyToolsPage />);

    const alphaButton = screen.getByRole("button", { name: /a–z/i });
    fireEvent.click(alphaButton);

    const cards = screen.getAllByTestId("project-card");
    // "My Schedule" < "Token Board" alphabetically
    expect(cards[0]).toHaveTextContent("My Schedule");
    expect(cards[1]).toHaveTextContent("Token Board");
  });

  it("does not show Building badge (app_instances have no generating state)", () => {
    mockUseQuery.mockReturnValue([mockTool]);
    render(<MyToolsPage />);
    expect(screen.queryByText("Building...")).not.toBeInTheDocument();
  });
});
