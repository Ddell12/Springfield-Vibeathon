import { render, screen } from "@testing-library/react";

import { Header } from "../header";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/builder",
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, className, ...rest }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => (
    <div className={className} data-testid="button" {...rest}>
      {children}
    </div>
  ),
}));

vi.mock("@/shared/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet">{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-trigger">{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-content">{children}</div>,
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}));

describe("Header", () => {
  it("renders the brand name as a link to home", () => {
    render(<Header />);
    const brand = screen.getByText("Bridges");
    expect(brand).toBeInTheDocument();
    expect(brand.closest("a")).toHaveAttribute("href", "/");
  });

  it("renders all navigation links", () => {
    render(<Header />);
    expect(screen.getAllByText("Builder").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Templates").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("My Apps").length).toBeGreaterThanOrEqual(1);
  });

  it("applies active styling to the current path link", () => {
    render(<Header />);
    // The Builder links (desktop + mobile) should have the active class
    const buttons = screen.getAllByTestId("button");
    const builderButtons = buttons.filter((btn) =>
      btn.textContent === "Builder"
    );
    expect(builderButtons.length).toBeGreaterThanOrEqual(1);
    builderButtons.forEach((btn) => {
      expect(btn.className).toContain("text-primary");
      expect(btn.className).toContain("bg-primary/10");
    });
  });

  it("does not apply active styling to non-current links", () => {
    render(<Header />);
    const buttons = screen.getAllByTestId("button");
    const templatesButtons = buttons.filter(
      (btn) => btn.textContent === "Templates"
    );
    expect(templatesButtons.length).toBeGreaterThanOrEqual(1);
    templatesButtons.forEach((btn) => {
      expect(btn.className).not.toContain("bg-primary/10");
    });
  });

  it("renders a mobile menu trigger", () => {
    render(<Header />);
    expect(screen.getByTestId("icon-menu")).toBeInTheDocument();
  });
});
