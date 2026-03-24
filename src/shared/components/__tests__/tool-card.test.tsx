import { render, screen } from "@testing-library/react";
import { ToolCard } from "../tool-card";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid="icon">{icon}</span>
  ),
}));

vi.mock("@/shared/components/type-badge", () => ({
  TypeBadge: ({ type }: { type: string }) => (
    <span data-testid="badge">{type}</span>
  ),
}));

describe("ToolCard", () => {
  it("renders the title", () => {
    render(
      <ToolCard title="Morning Routine" toolType="visual-schedule" variant="tool" />
    );
    expect(screen.getByText("Morning Routine")).toBeInTheDocument();
  });

  it("renders the type badge with the correct type", () => {
    render(
      <ToolCard title="My Board" toolType="token-board" variant="tool" />
    );
    expect(screen.getByTestId("badge")).toHaveTextContent("token-board");
  });

  it("shows the date for tool variant", () => {
    render(
      <ToolCard
        title="My Board"
        toolType="communication-board"
        variant="tool"
        date="March 20, 2026"
      />
    );
    expect(screen.getByText("March 20, 2026")).toBeInTheDocument();
  });

  it("shows Share and Delete buttons for tool variant", () => {
    render(
      <ToolCard title="My Board" toolType="token-board" variant="tool" />
    );
    expect(screen.getByTitle("Share")).toBeInTheDocument();
    expect(screen.getByTitle("Delete")).toBeInTheDocument();
  });

  it("shows description for template variant", () => {
    render(
      <ToolCard
        title="Starter Template"
        toolType="choice-board"
        variant="template"
        description="A great starting point"
      />
    );
    expect(screen.getByText("A great starting point")).toBeInTheDocument();
  });

  it("shows Use Template link pointing to /builder for template variant", () => {
    render(
      <ToolCard
        title="Starter Template"
        toolType="choice-board"
        variant="template"
      />
    );
    const link = screen.getByText("Use Template");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/builder");
  });

  it("does not show date for template variant", () => {
    render(
      <ToolCard
        title="Starter"
        toolType="choice-board"
        variant="template"
        date="March 20, 2026"
      />
    );
    expect(screen.queryByText("March 20, 2026")).not.toBeInTheDocument();
  });
});
