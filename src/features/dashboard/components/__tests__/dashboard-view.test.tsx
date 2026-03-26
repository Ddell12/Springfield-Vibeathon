import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";

import { DashboardView } from "../dashboard-view";

var mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn().mockReturnValue(undefined),
}));

vi.mock("@/shared/components/empty-state", () => ({
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
}));

vi.mock("@/shared/components/mobile-nav-drawer", () => ({
  MobileNavDrawer: () => null,
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid="icon">{icon}</span>
  ),
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, asChild, ...props }: any) => {
    if (asChild) return <>{children}</>;
    return (
      <button onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    );
  },
}));

vi.mock("@/shared/components/ui/tabs", () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children }: any) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value, ...props }: any) => (
    <button role="tab" data-value={value} {...props}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-${value}`}>{children}</div>
  ),
}));

vi.mock("../main-prompt-input", () => ({
  MainPromptInput: () => <div data-testid="prompt-input" />,
}));

vi.mock("../project-card", () => ({
  ProjectCard: ({ project }: any) => (
    <div data-testid="project-card">{project.title}</div>
  ),
}));

vi.mock("../templates-tab", () => ({
  TemplatesTab: () => <div data-testid="templates-tab" />,
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    sessions: {
      list: "sessions:list",
    },
  },
}));

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;

describe("DashboardView", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockUseQuery.mockReturnValue(undefined);
  });

  it("renders heading 'What would you like to build?'", () => {
    render(<DashboardView />);
    expect(
      screen.getByText("What would you like to build?")
    ).toBeInTheDocument();
  });

  it("shows MainPromptInput", () => {
    render(<DashboardView />);
    expect(screen.getByTestId("prompt-input")).toBeInTheDocument();
  });

  it("shows template chips (Token Board, Visual Schedule, etc.)", () => {
    render(<DashboardView />);
    expect(screen.getByRole("button", { name: /Token Board/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Visual Schedule/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Communication Board/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Social Story/i })).toBeInTheDocument();
  });

  it("shows skeleton placeholders in loading state (useQuery returns undefined)", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<DashboardView />);
    // Loading state renders 3 animated pulse divs
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows 'No apps yet' message when sessions are empty", () => {
    mockUseQuery.mockReturnValue([]);
    render(<DashboardView />);
    // The recent tab shows an inline "No apps yet" text when sessions is empty array
    expect(
      screen.getByText(/No apps yet — describe what you'd like to build!/i)
    ).toBeInTheDocument();
  });

  it("shows ProjectCards when sessions are loaded", () => {
    mockUseQuery.mockReturnValue([
      {
        _id: "id1",
        title: "My Token Board",
        _creationTime: Date.now(),
      },
      {
        _id: "id2",
        title: "Visual Schedule App",
        _creationTime: Date.now(),
      },
    ]);
    render(<DashboardView />);
    const cards = screen.getAllByTestId("project-card");
    expect(cards).toHaveLength(2);
    expect(screen.getByText("My Token Board")).toBeInTheDocument();
    expect(screen.getByText("Visual Schedule App")).toBeInTheDocument();
  });

  it("'Create New' link points to /builder", () => {
    render(<DashboardView />);
    const createLinks = screen.getAllByRole("link", { name: /Create New/i });
    expect(createLinks.length).toBeGreaterThan(0);
    expect(createLinks[0]).toHaveAttribute("href", "/builder");
  });

  it("mobile menu button has aria-label 'Open navigation menu'", () => {
    render(<DashboardView />);
    const menuBtn = screen.getByRole("button", {
      name: /Open navigation menu/i,
    });
    expect(menuBtn).toBeInTheDocument();
  });

  it("renders TemplatesTab in templates tab content", () => {
    render(<DashboardView />);
    expect(screen.getByTestId("tab-templates")).toBeInTheDocument();
    expect(screen.getByTestId("templates-tab")).toBeInTheDocument();
  });
});
