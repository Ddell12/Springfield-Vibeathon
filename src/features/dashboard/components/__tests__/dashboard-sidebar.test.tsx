import { render, screen } from "@testing-library/react";

import { DashboardSidebar } from "../dashboard-sidebar";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => ({ get: () => null }),
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
    { icon: "home", label: "Home", href: "/" },
    { icon: "auto_awesome", label: "Builder", href: "/builder" },
  ],
  isNavActive: vi.fn((href: string) => href === "/"),
}));

describe("DashboardSidebar", () => {
  it("renders nav links from NAV_ITEMS", () => {
    render(<DashboardSidebar />);
    // 2 nav item links + 1 logo link = 3 total
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/builder");
  });

  it("logo 'B' links to /", () => {
    render(<DashboardSidebar />);
    const logoLink = screen.getByText("B").closest("a");
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("shows avatar 'D'", () => {
    render(<DashboardSidebar />);
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("shows tooltip labels for nav items", () => {
    render(<DashboardSidebar />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Builder")).toBeInTheDocument();
  });

  it("renders icons for each nav item", () => {
    render(<DashboardSidebar />);
    const icons = screen.getAllByTestId("icon");
    const iconValues = icons.map((el) => el.textContent);
    expect(iconValues).toContain("home");
    expect(iconValues).toContain("auto_awesome");
  });
});
