import { render, screen, fireEvent } from "@testing-library/react";

import { MobileNavDrawer } from "../mobile-nav-drawer";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="icon">{icon}</span>,
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, asChild, ...props }: any) => {
    if (asChild) return <>{children}</>;
    return <button onClick={onClick} disabled={disabled} {...props}>{children}</button>;
  },
}));

vi.mock("@/shared/components/ui/sheet", () => ({
  Sheet: ({ open, children }: any) => open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h2>{children}</h2>,
  SheetDescription: ({ children }: any) => <p>{children}</p>,
}));

const mockPathname = vi.fn().mockReturnValue("/dashboard");
const mockSearchParams = { get: vi.fn().mockReturnValue(null) };
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/shared/lib/navigation", () => ({
  NAV_ITEMS: [
    { icon: "home", label: "Home", href: "/dashboard" },
    { icon: "auto_awesome", label: "Builder", href: "/builder" },
  ],
  isNavActive: vi.fn().mockReturnValue(false),
}));

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
};

describe("MobileNavDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("open=true renders navigation links", () => {
    render(<MobileNavDrawer {...defaultProps} />);
    expect(screen.getByTestId("sheet")).toBeInTheDocument();
  });

  it("shows 'Bridges' brand name", () => {
    render(<MobileNavDrawer {...defaultProps} />);
    expect(screen.getByText("Bridges")).toBeInTheDocument();
  });

  it("shows nav items from NAV_ITEMS", () => {
    render(<MobileNavDrawer {...defaultProps} />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Builder")).toBeInTheDocument();
  });

  it("clicking a nav link calls onOpenChange(false)", () => {
    const onOpenChange = vi.fn();
    render(<MobileNavDrawer open={true} onOpenChange={onOpenChange} />);
    // Click the "Home" link
    fireEvent.click(screen.getByText("Home"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Close button calls onOpenChange(false)", () => {
    const onOpenChange = vi.fn();
    render(<MobileNavDrawer open={true} onOpenChange={onOpenChange} />);
    const closeBtn = screen.getByRole("button", { name: "Close navigation" });
    fireEvent.click(closeBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("'New Project' link points to /builder", () => {
    render(<MobileNavDrawer {...defaultProps} />);
    const newProjectLink = screen.getByText("New Project").closest("a");
    expect(newProjectLink).toHaveAttribute("href", "/builder");
  });

  it("open=false renders nothing", () => {
    const { container } = render(<MobileNavDrawer open={false} onOpenChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows 'Version 1.0' text", () => {
    render(<MobileNavDrawer {...defaultProps} />);
    expect(screen.getByText("Version 1.0")).toBeInTheDocument();
  });
});
