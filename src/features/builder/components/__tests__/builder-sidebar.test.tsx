import { render, screen } from "@testing-library/react";
import { BuilderSidebar } from "../builder-sidebar";

const mockUsePathname = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

describe("BuilderSidebar", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/builder");
  });

  it("renders the Core Builder section label", () => {
    render(<BuilderSidebar />);
    expect(screen.getByText("Core Builder")).toBeInTheDocument();
  });

  it("renders all four navigation items", () => {
    render(<BuilderSidebar />);
    expect(screen.getByRole("link", { name: /Builder/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Assets/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Library/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Settings/ })).toBeInTheDocument();
  });

  it("applies active styling to the current route", () => {
    mockUsePathname.mockReturnValue("/builder/assets");
    render(<BuilderSidebar />);
    const assetsLink = screen.getByRole("link", { name: /Assets/ });
    expect(assetsLink.className).toContain("bg-primary/5");
    expect(assetsLink.className).toContain("text-primary");
  });

  it("renders the Deploy Tool button", () => {
    render(<BuilderSidebar />);
    expect(
      screen.getByRole("button", { name: /Deploy Tool/ })
    ).toBeInTheDocument();
  });

  it("renders the Help link", () => {
    render(<BuilderSidebar />);
    const helpLink = screen.getByRole("link", { name: /Help/ });
    expect(helpLink).toHaveAttribute("href", "/builder/help");
  });
});
