import { render, screen } from "@testing-library/react";

import { MarketingHeader } from "../marketing-header";

vi.mock("@clerk/nextjs", () => ({
  Show: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <div data-testid="user-button" />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => ({ get: () => null })),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, className, ...rest }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => (
    <button className={className} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@/shared/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet">{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-trigger">{children}</div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));


describe("MarketingHeader", () => {
  it("renders the Bridges logo as a link to home", () => {
    render(<MarketingHeader />);
    const logo = screen.getByText("Bridges");
    expect(logo).toBeInTheDocument();
    expect(logo.closest("a")).toHaveAttribute("href", "/");
  });

  it("renders all navigation links", () => {
    render(<MarketingHeader />);
    expect(screen.getAllByText("Platform").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Solutions").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Learn").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the Try Bridges CTA button", () => {
    render(<MarketingHeader />);
    const ctaLinks = screen.getAllByText("Try Bridges");
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
    // Desktop CTA links to the sign-in flow
    const desktopCta = ctaLinks.find(
      (el) => el.closest("a")?.getAttribute("href") === "/sign-in?role=slp"
    );
    expect(desktopCta).toBeDefined();
  });

  it("renders a mobile menu trigger", () => {
    render(<MarketingHeader />);
    expect(screen.getByTestId("sheet-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("icon-menu")).toBeInTheDocument();
  });

  it("highlights active nav link when pathname matches", async () => {
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/platform");

    render(<MarketingHeader />);

    const platformLinks = screen.getAllByText("Platform");
    const desktopLink = platformLinks.find(
      (el) => el.closest("a")?.getAttribute("href") === "/platform"
    );
    expect(desktopLink).toBeDefined();
    expect(desktopLink?.className).toContain("bg-surface");

    const learnLinks = screen.getAllByText("Learn");
    const learnLink = learnLinks.find(
      (el) => el.closest("a")?.getAttribute("href") === "/learn"
    );
    expect(learnLink?.className).toContain("text-on-surface-variant");
  });
});
