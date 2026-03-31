import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ExploreCtaSection } from "../explore-cta-section";

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

describe("ExploreCtaSection", () => {
  test("renders primary CTA linking to /builder", () => {
    render(<ExploreCtaSection />);
    const link = screen.getByRole("link", { name: /start building/i });
    expect(link).toHaveAttribute("href", "/builder");
  });

  test("renders secondary CTA linking to /library?tab=templates", () => {
    render(<ExploreCtaSection />);
    const link = screen.getByRole("link", { name: /browse templates/i });
    expect(link).toHaveAttribute("href", "/library?tab=templates");
  });
});
