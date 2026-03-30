import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardSidebar } from "../dashboard-sidebar";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div data-testid="user-button" />,
  Show: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useUser: () => ({
    user: { publicMetadata: { role: "caregiver" } },
  }),
}));

vi.mock("@/features/sessions/components/notification-bell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/family",
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid="icon">{icon}</span>
  ),
}));

vi.mock("@/core/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/shared/lib/navigation", () => ({
  NAV_ITEMS: [
    { icon: "home", label: "Home", href: "/dashboard" },
    { icon: "group", label: "Patients", href: "/patients" },
    { icon: "settings", label: "Settings", href: "/settings" },
  ],
  CAREGIVER_NAV_ITEMS: [
    { icon: "home", label: "Home", href: "/family" },
    { icon: "settings", label: "Settings", href: "/settings" },
  ],
  isNavActive: vi.fn((href: string) => href === "/family"),
}));

describe("DashboardSidebar (caregiver)", () => {
  it("shows caregiver nav items (Home + Settings only)", () => {
    render(<DashboardSidebar />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("does NOT show SLP-only nav items", () => {
    render(<DashboardSidebar />);
    expect(screen.queryByText("Patients")).not.toBeInTheDocument();
  });

  it("logo links to /family for caregivers", () => {
    render(<DashboardSidebar />);
    const logoLink = screen.getByText("B").closest("a");
    expect(logoLink).toHaveAttribute("href", "/family");
  });

  it("renders caregiver nav links", () => {
    render(<DashboardSidebar />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/family");
    expect(hrefs).toContain("/settings");
    expect(hrefs).not.toContain("/patients");
  });

  it("shows user button", () => {
    render(<DashboardSidebar />);
    expect(screen.getByTestId("user-button")).toBeInTheDocument();
  });
});
