import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { useQuery } from "convex/react";
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

describe("TemplatesPage", () => {
  test("renders page heading", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(<TemplatesPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /templates/i }),
    ).toBeInTheDocument();
  });

  test("renders description text", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(<TemplatesPage />);

    expect(
      screen.getByText(/start with a proven template/i),
    ).toBeInTheDocument();
  });

  test("shows skeleton loaders when useQuery returns undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    render(<TemplatesPage />);

    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons).toHaveLength(6);
  });

  test("renders template cards when useQuery returns data", () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        _id: "1",
        title: "Feelings Board",
        toolType: "communication-board",
        description: "Express emotions",
      },
      {
        _id: "2",
        title: "Star Chart",
        toolType: "token-board",
        description: "Earn rewards",
      },
    ]);
    render(<TemplatesPage />);

    const cards = screen.getAllByTestId("tool-card");
    expect(cards).toHaveLength(2);
    expect(screen.getByText("Feelings Board")).toBeInTheDocument();
    expect(screen.getByText("Star Chart")).toBeInTheDocument();
  });

  test("renders category tab buttons", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(<TemplatesPage />);

    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /communication/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /rewards/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /routines/i }),
    ).toBeInTheDocument();
  });

  test("renders CTA section with link to builder", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(<TemplatesPage />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /can't find what you're looking for/i,
      }),
    ).toBeInTheDocument();

    const ctaLink = screen.getByRole("link", {
      name: /build a custom template/i,
    });
    expect(ctaLink).toHaveAttribute("href", "/builder");
  });
});
