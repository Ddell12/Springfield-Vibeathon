import { render, screen } from "@testing-library/react";

import { MarketingHeader } from "../marketing-header";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: any) => <span>{icon}</span>,
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, className, ...rest }: any) => (
    <button className={className} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@/shared/components/ui/sheet", () => ({
  Sheet: ({ children }: any) => <div data-testid="sheet">{children}</div>,
  SheetTrigger: ({ children, asChild }: any) => (
    <div data-testid="sheet-trigger">{children}</div>
  ),
  SheetContent: ({ children }: any) => (
    <div data-testid="sheet-content">{children}</div>
  ),
}));

vi.mock("lucide-react", () => ({
  Menu: (props: any) => <svg data-testid="menu-icon" {...props} />,
}));

describe("MarketingHeader — accessibility", () => {
  it("header element has backdrop-blur class", () => {
    const { container } = render(<MarketingHeader />);
    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    // After Phase 5 polish, header should have backdrop-blur for glass effect
    expect(header!.className).toMatch(/backdrop-blur/);
  });

  it("hamburger button has aria-label 'Open menu'", () => {
    render(<MarketingHeader />);
    const menuButton = screen.getByRole("button", { name: /open menu/i });
    expect(menuButton).toBeInTheDocument();
    expect(menuButton).toHaveAttribute("aria-label", "Open menu");
  });
});
