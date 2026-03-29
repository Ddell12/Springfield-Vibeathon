import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { DemoToolModal } from "../demo-tool-modal";

vi.mock("@/core/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

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

vi.mock("@/shared/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

vi.mock("@/shared/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

// Mock window.matchMedia for useIsDesktop hook — default to desktop
Object.defineProperty(window, "matchMedia", {
  value: vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
});

describe("DemoToolModal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: "Communication Board",
    description: "A picture-based AAC board",
    shareSlug: "feat-comm",
    prompt: "Build a communication board...",
  };

  test("renders iframe with correct src when open", () => {
    render(<DemoToolModal {...defaultProps} />);
    const iframe = screen.getByTitle("Communication Board");
    expect(iframe).toHaveAttribute("src", "/api/tool/feat-comm");
    expect(iframe).toHaveAttribute("sandbox", "allow-scripts");
  });

  test("renders 'Customize This' link with encoded prompt", () => {
    render(<DemoToolModal {...defaultProps} />);
    const link = screen.getByRole("link", { name: /customize this/i });
    expect(link).toHaveAttribute(
      "href",
      `/builder?prompt=${encodeURIComponent("Build a communication board...")}`
    );
  });

  test("does not render when closed", () => {
    render(<DemoToolModal {...defaultProps} open={false} />);
    expect(screen.queryByTitle("Communication Board")).not.toBeInTheDocument();
  });
});
