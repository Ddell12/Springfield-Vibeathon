// Templates page uses static seed data — no empty state exists.
// This file tests the static template grid and CTA section behavior.
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { TemplatesPage } from "../templates-page";

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
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/core/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}));

describe("TemplatesPage — static seed grid", () => {
  test("always renders all 4 template cards (no empty state)", () => {
    render(<TemplatesPage />);
    // The page never shows an empty state — it uses hardcoded seed data
    expect(screen.queryByText(/no templates/i)).not.toBeInTheDocument();
    expect(screen.getByText("Communication Board")).toBeInTheDocument();
    expect(screen.getByText("Morning Routine")).toBeInTheDocument();
    expect(screen.getByText("5-Star Reward Board")).toBeInTheDocument();
    expect(screen.getByText("Going to the Dentist")).toBeInTheDocument();
  });

  test("CTA section links to /tools/new", () => {
    render(<TemplatesPage />);
    const ctaLink = screen.getByRole("link", { name: /create a tool/i });
    expect(ctaLink).toHaveAttribute("href", "/tools/new");
  });

  test("template cards link to /tools/new (not legacy /builder)", () => {
    render(<TemplatesPage />);
    // All template card links should point to /tools/new
    const links = screen.getAllByRole("link");
    const toolsLinks = links.filter((l) => l.getAttribute("href") === "/tools/new");
    expect(toolsLinks.length).toBeGreaterThanOrEqual(4);
    // No links should use the retired /builder route
    const builderLinks = links.filter((l) => l.getAttribute("href")?.startsWith("/builder"));
    expect(builderLinks.length).toBe(0);
  });
});
