import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BuilderV2Header } from "../builder-header";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

function getButtonByText(name: string) {
  const buttons = screen.getAllByRole("button");
  return buttons.find((btn) => btn.textContent?.includes(name))!;
}

describe("BuilderV2Header", () => {
  it("renders the Bridges logo linking to home", () => {
    render(<BuilderV2Header />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/");
    expect(within(link).getByText("Bridges")).toBeInTheDocument();
  });

  it("renders the project name when projectName is provided", () => {
    render(<BuilderV2Header projectName="Morning Routine App" />);
    expect(screen.getByText("Morning Routine App")).toBeInTheDocument();
  });

  it("does not show a project name breadcrumb when projectName is not provided", () => {
    render(<BuilderV2Header />);
    expect(screen.queryByText("Morning Routine App")).not.toBeInTheDocument();
  });

  it("renders a Share button when hasProject is true", () => {
    render(<BuilderV2Header hasProject={true} />);
    expect(getButtonByText("Share")).toBeInTheDocument();
  });

  it("does not render Share button when hasProject is false", () => {
    render(<BuilderV2Header hasProject={false} />);
    const shareBtn = screen.getAllByRole("button").find((btn) => btn.textContent?.includes("Share"));
    expect(shareBtn).toBeUndefined();
  });

  it("renders a New Project button", () => {
    render(<BuilderV2Header />);
    expect(getButtonByText("New Project")).toBeInTheDocument();
  });

  it("calls onNewProject when New Project button is clicked", async () => {
    const onNewProject = vi.fn();
    const user = userEvent.setup();

    render(<BuilderV2Header onNewProject={onNewProject} />);
    await user.click(getButtonByText("New Project"));

    expect(onNewProject).toHaveBeenCalledTimes(1);
  });

  it("calls onShare when Share button is clicked", async () => {
    const onShare = vi.fn();
    const user = userEvent.setup();

    render(<BuilderV2Header hasProject={true} onShare={onShare} />);
    await user.click(getButtonByText("Share"));

    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it("renders Download button when hasProject and onDownload provided", () => {
    render(<BuilderV2Header hasProject={true} onDownload={() => {}} />);
    expect(screen.getByTestId("icon-download")).toBeInTheDocument();
  });

  it("calls onDownload when Download button is clicked", async () => {
    const onDownload = vi.fn();
    const user = userEvent.setup();

    render(<BuilderV2Header hasProject={true} onDownload={onDownload} />);
    await user.click(getButtonByText("Download"));

    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it("renders a header landmark element", () => {
    render(<BuilderV2Header />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });
});
