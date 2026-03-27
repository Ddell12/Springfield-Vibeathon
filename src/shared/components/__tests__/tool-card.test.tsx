import { fireEvent, render, screen } from "@testing-library/react";

import { ToolCard } from "../tool-card";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
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

vi.mock("@/shared/components/delete-confirmation-dialog", () => ({
  DeleteConfirmationDialog: ({ open, onConfirmDelete, projectName }: any) =>
    open ? (
      <div data-testid="delete-dialog">
        <span>Delete {projectName}?</span>
        <button onClick={onConfirmDelete}>Confirm Delete</button>
      </div>
    ) : null,
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

  it("shows Use Template link with prompt param when prompt is provided", () => {
    render(
      <ToolCard
        title="Starter Template"
        toolType="choice-board"
        variant="template"
        prompt="Build a token board"
      />
    );
    const link = screen.getByText("Use Template");
    expect(link.closest("a")).toHaveAttribute(
      "href",
      `/builder?prompt=${encodeURIComponent("Build a token board")}`
    );
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

  it("opens delete dialog and calls onDelete when confirmed", () => {
    const onDelete = vi.fn();
    render(
      <ToolCard title="My Board" toolType="token-board" variant="tool" onDelete={onDelete} />
    );
    // Click delete button to open dialog
    fireEvent.click(screen.getByTitle("Delete"));
    // Dialog should appear
    expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete My Board?")).toBeInTheDocument();
    // Confirm deletion
    fireEvent.click(screen.getByText("Confirm Delete"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("calls onShare when share button is clicked", () => {
    const onShare = vi.fn();
    render(
      <ToolCard title="My Board" toolType="token-board" variant="tool" onShare={onShare} />
    );
    fireEvent.click(screen.getByTitle("Share"));
    expect(onShare).toHaveBeenCalledTimes(1);
  });
});
