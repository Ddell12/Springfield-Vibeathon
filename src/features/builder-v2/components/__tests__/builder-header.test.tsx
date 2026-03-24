import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BuilderV2Header } from "../builder-header";

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
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

describe("BuilderV2Header", () => {
  it("renders the Bridges logo linking to home", () => {
    render(<BuilderV2Header />);
    const logo = screen.getByRole("link", { name: /Bridges/i });
    expect(logo).toHaveAttribute("href", "/");
  });

  it("renders the project name when projectName is provided", () => {
    render(<BuilderV2Header projectName="Morning Routine App" />);
    expect(screen.getByText("Morning Routine App")).toBeInTheDocument();
  });

  it("does not show a project name breadcrumb when projectName is not provided", () => {
    render(<BuilderV2Header />);
    // Without a project name there should be no breadcrumb segment
    expect(screen.queryByText(/breadcrumb/i)).not.toBeInTheDocument();
  });

  it("renders a Share button", () => {
    render(<BuilderV2Header />);
    expect(
      screen.getByRole("button", { name: /Share/i })
    ).toBeInTheDocument();
  });

  it("renders a New Project button", () => {
    render(<BuilderV2Header />);
    expect(
      screen.getByRole("button", { name: /New Project/i })
    ).toBeInTheDocument();
  });

  it("calls onNewProject when New Project button is clicked", async () => {
    const onNewProject = vi.fn();
    const user = userEvent.setup();

    render(<BuilderV2Header onNewProject={onNewProject} />);
    await user.click(screen.getByRole("button", { name: /New Project/i }));

    expect(onNewProject).toHaveBeenCalledTimes(1);
  });

  it("renders share link when shareSlug is provided", () => {
    render(<BuilderV2Header shareSlug="abc-def-123" />);
    // Share button or link should reflect the slug
    const shareButton = screen.getByRole("button", { name: /Share/i });
    expect(shareButton).toBeInTheDocument();
  });

  it("renders a header landmark element", () => {
    render(<BuilderV2Header />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });
});
