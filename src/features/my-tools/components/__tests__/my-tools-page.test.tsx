import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { MyToolsPage } from "../my-tools-page";

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

describe("MyToolsPage", () => {
  test("renders page heading", () => {
    render(<MyToolsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /my tools/i }),
    ).toBeInTheDocument();
  });

  test("renders tool count", () => {
    render(<MyToolsPage />);

    expect(screen.getByText(/3 tools created/i)).toBeInTheDocument();
  });

  test("renders all tool cards from mock data", () => {
    render(<MyToolsPage />);

    const cards = screen.getAllByTestId("tool-card");
    expect(cards).toHaveLength(3);
    expect(screen.getByText("Emma's Feelings Board")).toBeInTheDocument();
    expect(screen.getByText("Alex's Star Chart")).toBeInTheDocument();
    expect(screen.getByText("Morning Routine")).toBeInTheDocument();
  });

  test("renders Create New Tool CTA linking to /builder", () => {
    render(<MyToolsPage />);

    const createLink = screen.getByRole("link", { name: /create new tool/i });
    expect(createLink).toBeInTheDocument();
    expect(createLink).toHaveAttribute("href", "/builder");
  });

  test("renders custom tool CTA section with Start Building and Browse Templates links", () => {
    render(<MyToolsPage />);

    expect(
      screen.getByRole("heading", { level: 2, name: /need a custom tool/i }),
    ).toBeInTheDocument();

    const startLink = screen.getByRole("link", { name: /start building/i });
    expect(startLink).toHaveAttribute("href", "/builder");

    const browseLink = screen.getByRole("link", {
      name: /browse templates/i,
    });
    expect(browseLink).toHaveAttribute("href", "/templates");
  });
});
