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

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}));

describe("TemplatesPage", () => {
  test("renders page heading", () => {
    render(<TemplatesPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /start with a template/i }),
    ).toBeInTheDocument();
  });

  test("renders description text", () => {
    render(<TemplatesPage />);
    expect(
      screen.getByText(/choose a proven therapy app template/i),
    ).toBeInTheDocument();
  });

  test("renders 4 template cards from seed data", () => {
    render(<TemplatesPage />);
    // The 4 templates from THERAPY_SEED_PROMPTS
    expect(screen.getByText("Communication Board")).toBeInTheDocument();
    expect(screen.getByText("Morning Routine")).toBeInTheDocument();
    expect(screen.getByText("5-Star Reward Board")).toBeInTheDocument();
    expect(screen.getByText("Going to the Dentist")).toBeInTheDocument();
  });

  test("template cards link to /builder with encoded prompt", () => {
    render(<TemplatesPage />);
    const links = screen.getAllByRole("link");
    // At least the 4 template cards + the CTA link
    const builderLinks = links.filter((l) =>
      l.getAttribute("href")?.startsWith("/builder"),
    );
    expect(builderLinks.length).toBeGreaterThanOrEqual(4);
  });

  test("template card links use prompt query param encoding", () => {
    render(<TemplatesPage />);
    const links = screen.getAllByRole("link");
    const templateLinks = links.filter((l) =>
      l.getAttribute("href")?.startsWith("/builder?prompt="),
    );
    expect(templateLinks.length).toBe(4);
  });

  test("renders 'Have something else in mind?' CTA section", () => {
    render(<TemplatesPage />);
    expect(
      screen.getByRole("heading", { level: 2, name: /have something else in mind/i }),
    ).toBeInTheDocument();
  });

  test("renders 'Build a Custom App' CTA link to /builder", () => {
    render(<TemplatesPage />);
    const ctaLink = screen.getByRole("link", { name: /build a custom app/i });
    expect(ctaLink).toHaveAttribute("href", "/builder");
  });

  test("renders 'Click to build' sub-text on each card", () => {
    render(<TemplatesPage />);
    const clickToBuildItems = screen.getAllByText(/click to build/i);
    expect(clickToBuildItems).toHaveLength(4);
  });
});
