import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DashboardSidebar } from "../dashboard-sidebar";

vi.mock("convex/react", () => ({
  useQuery: () => [],
}));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Jane", lastName: "SLP", email: "jane@test.com", publicMetadata: { role: "slp" } } }),
  useClerk: () => ({ signOut: vi.fn() }),
  Show: ({ when, children }: any) => (when === "signed-in" ? <>{children}</> : null),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/builder",
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("@/shared/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

beforeEach(() => {
  localStorage.clear();
});

describe("DashboardSidebar (SLP)", () => {
  it("renders New App button linking to /builder?new=1", () => {
    render(<DashboardSidebar />);
    expect(screen.getByRole("link", { name: /new app/i })).toHaveAttribute("href", "/builder?new=1");
  });
  it("renders Builder, Patients, Sessions, Billing, Speech Coach, Library nav items", () => {
    render(<DashboardSidebar />);
    ["Builder", "Patients", "Sessions", "Billing", "Speech Coach", "Library"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
  it("does not render Home, Flashcards, Settings as nav items", () => {
    render(<DashboardSidebar />);
    expect(screen.queryByRole("link", { name: /^home$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /flashcards/i })).not.toBeInTheDocument();
    // Settings exists in user menu, but not as a top-level nav item
    const settingsLinks = screen.queryAllByText("Settings");
    // Should only appear in user menu, not in nav
    expect(settingsLinks.length).toBeLessThanOrEqual(1);
  });
  it("toggles collapsed state when hamburger is clicked", () => {
    render(<DashboardSidebar />);
    const toggle = screen.getByRole("button", { name: /toggle sidebar/i });
    fireEvent.click(toggle);
    // After collapse, nav labels should be removed from the DOM
    expect(screen.queryByText("Patients")).not.toBeInTheDocument();
  });
  it("shows Recents section when expanded", () => {
    render(<DashboardSidebar />);
    expect(screen.getByText(/recents/i)).toBeInTheDocument();
  });
  it("shows user name in user menu trigger when expanded", () => {
    render(<DashboardSidebar />);
    // firstName and lastName are in separate text nodes; use a function matcher
    const nameElements = screen.getAllByText((_, el) => el?.textContent === "Jane SLP" && el?.tagName === "P");
    expect(nameElements.length).toBeGreaterThanOrEqual(1);
  });
});
