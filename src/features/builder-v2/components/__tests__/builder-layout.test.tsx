import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BuilderV2Layout } from "../builder-layout";

const mockUseMediaQuery = vi.fn();

vi.mock("usehooks-ts", () => ({
  useMediaQuery: (query: string) => mockUseMediaQuery(query),
}));

vi.mock("@/shared/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, ...props }: any) => (
    <div data-testid="panel-group" {...props}>
      {children}
    </div>
  ),
  ResizablePanel: ({ children, ...props }: any) => (
    <div data-testid="panel" {...props}>
      {children}
    </div>
  ),
  ResizableHandle: (props: any) => <div data-testid="handle" {...props} />,
}));

describe("BuilderV2Layout", () => {
  const chatContent = <div>Chat Panel</div>;
  const previewContent = <div>Preview Panel</div>;

  it("renders both panels in resizable layout on desktop", () => {
    mockUseMediaQuery.mockReturnValue(false);
    render(
      <BuilderV2Layout chatPanel={chatContent} previewPanel={previewContent} />
    );
    expect(screen.getByText("Chat Panel")).toBeInTheDocument();
    expect(screen.getByText("Preview Panel")).toBeInTheDocument();
    expect(screen.getByTestId("panel-group")).toBeInTheDocument();
    expect(screen.getAllByTestId("panel")).toHaveLength(2);
  });

  it("renders the resize handle between panels on desktop", () => {
    mockUseMediaQuery.mockReturnValue(false);
    render(
      <BuilderV2Layout chatPanel={chatContent} previewPanel={previewContent} />
    );
    expect(screen.getByTestId("handle")).toBeInTheDocument();
  });

  it("renders stacked layout without resize handle on mobile", () => {
    mockUseMediaQuery.mockReturnValue(true);
    render(
      <BuilderV2Layout chatPanel={chatContent} previewPanel={previewContent} />
    );
    expect(screen.getByText("Chat Panel")).toBeInTheDocument();
    expect(screen.getByText("Preview Panel")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-group")).not.toBeInTheDocument();
    expect(screen.queryByTestId("handle")).not.toBeInTheDocument();
  });

  it("renders chat panel above preview panel in mobile stacked layout", () => {
    mockUseMediaQuery.mockReturnValue(true);
    const { container } = render(
      <BuilderV2Layout chatPanel={chatContent} previewPanel={previewContent} />
    );
    const text = container.textContent ?? "";
    const chatIndex = text.indexOf("Chat Panel");
    const previewIndex = text.indexOf("Preview Panel");
    // Chat should appear before preview in the document order
    expect(chatIndex).toBeLessThan(previewIndex);
  });

  it("has horizontal orientation on desktop resizable layout", () => {
    mockUseMediaQuery.mockReturnValue(false);
    render(
      <BuilderV2Layout chatPanel={chatContent} previewPanel={previewContent} />
    );
    const panelGroup = screen.getByTestId("panel-group");
    // orientation should be horizontal (desktop side-by-side)
    expect(panelGroup.getAttribute("direction") ?? panelGroup.getAttribute("orientation")).toMatch(/horizontal/i);
  });
});
