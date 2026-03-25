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

vi.mock("@/core/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  BookOpen: () => <svg data-testid="icon-book-open" />,
  MessageSquare: () => <svg data-testid="icon-message-square" />,
  Star: () => <svg data-testid="icon-star" />,
  Sun: () => <svg data-testid="icon-sun" />,
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

  test("CTA section links to /builder", () => {
    render(<TemplatesPage />);
    const ctaLink = screen.getByRole("link", { name: /build a custom app/i });
    expect(ctaLink).toHaveAttribute("href", "/builder");
  });

  test("does not use Convex useQuery — page is fully static", () => {
    // This test simply verifies no runtime error occurs without a ConvexProvider.
    // The previous design called useQuery; the new design imports static seed data.
    expect(() => render(<TemplatesPage />)).not.toThrow();
  });
});
