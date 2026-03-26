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
    expect(screen.getAllByText("Builder").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Templates").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("My Apps").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the Start Building CTA button", () => {
    render(<MarketingHeader />);
    const ctaLinks = screen.getAllByText("Start Building");
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
    // Desktop CTA links to /builder
    const desktopCta = ctaLinks.find(
      (el) => el.closest("a")?.getAttribute("href") === "/builder"
    );
    expect(desktopCta).toBeDefined();
  });

  it("renders a mobile menu trigger", () => {
    render(<MarketingHeader />);
    expect(screen.getByTestId("sheet-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("icon-menu")).toBeInTheDocument();
  });

  it("highlights active nav link when pathname matches", async () => {
    // Re-mock usePathname to return /templates
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/templates");

    render(<MarketingHeader />);

    // Find the Templates link - it should have the active class
    const templatesLinks = screen.getAllByText("Templates");
    const desktopLink = templatesLinks.find(
      (el) => el.closest("a")?.getAttribute("href") === "/templates"
    );
    expect(desktopLink).toBeDefined();
    expect(desktopLink?.className).toContain("text-primary");

    // Builder should NOT have active class
    const builderLinks = screen.getAllByText("Builder");
    const builderLink = builderLinks.find(
      (el) => el.closest("a")?.getAttribute("href") === "/builder"
    );
    expect(builderLink?.className).toContain("text-on-surface-variant");
  });
});
