import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { describe, expect, test, vi } from "vitest";

import { TemplatesPage } from "../templates-page";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
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

vi.mock("@/core/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`}>{icon}</span>
  ),
}));

vi.mock("@/shared/components/tool-card", () => ({
  ToolCard: ({ title }: { title: string }) => (
    <div data-testid="tool-card">{title}</div>
  ),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    templates: {
      queries: {
        listTemplates: "templates:queries:listTemplates",
      },
    },
  },
}));

vi.mock("../../../../convex/_generated/dataModel", () => ({}));

describe("TemplatesPage — empty state", () => {
  test("shows 'No templates' message when useQuery returns empty array", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(<TemplatesPage />);

    expect(
      screen.getByText(/no templates/i)
    ).toBeInTheDocument();
  });

  test("shows a link to builder when templates list is empty", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(<TemplatesPage />);

    const builderLink = screen.getByRole("link", { name: /builder|build/i });
    expect(builderLink).toHaveAttribute("href", "/builder");
  });

  test("does NOT show empty state message when templates are present", () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        _id: "1",
        title: "Feelings Board",
        toolType: "communication-board",
        description: "Express emotions",
      },
    ]);
    render(<TemplatesPage />);

    expect(screen.queryByText(/no templates/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("tool-card")).toBeInTheDocument();
  });
});
