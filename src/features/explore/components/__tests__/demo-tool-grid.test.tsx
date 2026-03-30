import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { EXPLORE_DEMO_TOOLS } from "../../lib/demo-tools";

const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@/core/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`}>{icon}</span>
  ),
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/shared/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/shared/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

Object.defineProperty(window, "matchMedia", {
  value: vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
});

import { DemoToolGrid } from "../demo-tool-grid";

describe("DemoToolGrid", () => {
  test("renders 6 skeleton cards while loading", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<DemoToolGrid />);
    const skeletons = screen.getAllByTestId("skeleton-card");
    expect(skeletons).toHaveLength(6);
  });

  test("renders cards from query data with shareSlug", () => {
    mockUseQuery.mockReturnValue([
      {
        title: "Communication Board",
        description: "AAC board",
        shareSlug: "feat-comm",
        featuredCategory: "communication",
        featuredOrder: 1,
      },
    ]);
    render(<DemoToolGrid />);
    expect(screen.getByText("Communication Board")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try it/i })).toBeEnabled();
  });

  test("falls back to static data on empty result", () => {
    mockUseQuery.mockReturnValue([]);
    render(<DemoToolGrid />);
    EXPLORE_DEMO_TOOLS.forEach((tool) => {
      expect(screen.getByText(tool.title)).toBeInTheDocument();
    });
    // Static fallback cards are enabled and navigate to builder with prompt
    const buttons = screen.getAllByRole("button", { name: /try it/i });
    buttons.forEach((btn) => expect(btn).toBeEnabled());
  });
});
