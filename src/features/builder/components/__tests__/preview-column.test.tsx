import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

vi.mock("../preview-panel", () => ({
  PreviewPanel: () => <div data-testid="preview-panel" />,
}));

vi.mock("../code-panel", () => ({
  CodePanel: () => <div data-testid="code-panel" />,
}));

import { PreviewColumn } from "../preview-column";

const baseProps = {
  bundleHtml: null as string | null,
  status: "idle" as const,
  deviceSize: "desktop" as const,
  buildFailed: false,
  viewMode: "preview" as const,
  onViewChange: vi.fn(),
  files: [],
};

describe("PreviewColumn", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders without crashing", () => {
    render(<PreviewColumn {...baseProps} />);
  });

  it("shows PreviewPanel when viewMode is 'preview'", () => {
    render(<PreviewColumn {...baseProps} viewMode="preview" />);
    expect(screen.getByTestId("preview-panel")).toBeInTheDocument();
  });

  it("shows CodePanel when viewMode is 'code'", () => {
    render(<PreviewColumn {...baseProps} viewMode="code" />);
    expect(screen.getByTestId("code-panel")).toBeInTheDocument();
  });

  it("clicking eye icon calls onViewChange with 'preview'", () => {
    const onViewChange = vi.fn();
    render(<PreviewColumn {...baseProps} viewMode="code" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));
    expect(onViewChange).toHaveBeenCalledWith("preview");
  });

  it("clicking code icon calls onViewChange with 'code'", () => {
    const onViewChange = vi.fn();
    render(<PreviewColumn {...baseProps} viewMode="preview" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByRole("button", { name: /source/i }));
    expect(onViewChange).toHaveBeenCalledWith("code");
  });

  it("shows Publish button", () => {
    render(<PreviewColumn {...baseProps} />);
    expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument();
  });

  it("clicking Publish calls onPublish", () => {
    const onPublish = vi.fn();
    render(<PreviewColumn {...baseProps} onPublish={onPublish} />);
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));
    expect(onPublish).toHaveBeenCalled();
  });

  it("clicking X calls onClose", () => {
    const onClose = vi.fn();
    render(<PreviewColumn {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows 'v1' label when bundleHtml is present", () => {
    render(<PreviewColumn {...baseProps} bundleHtml="<html></html>" />);
    expect(screen.getByText("v1")).toBeInTheDocument();
  });

  it("does NOT show 'v1' label when bundleHtml is null", () => {
    render(<PreviewColumn {...baseProps} bundleHtml={null} />);
    expect(screen.queryByText("v1")).not.toBeInTheDocument();
  });

  it("Copy button copies bundleHtml to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<PreviewColumn {...baseProps} bundleHtml="<html>test</html>" />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith("<html>test</html>");
  });
});
