import { render, screen } from "@testing-library/react";

import { BuilderLayout } from "../builder-layout";

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

describe("BuilderLayout", () => {
  const chatContent = <div>Chat Panel</div>;
  const previewContent = <div>Preview Panel</div>;

  it("renders both panels in resizable layout on desktop", () => {
    mockUseMediaQuery.mockReturnValue(false);
    render(
      <BuilderLayout chatPanel={chatContent} previewPanel={previewContent} />
    );
    expect(screen.getByText("Chat Panel")).toBeInTheDocument();
    expect(screen.getByText("Preview Panel")).toBeInTheDocument();
    expect(screen.getByTestId("panel-group")).toBeInTheDocument();
    expect(screen.getAllByTestId("panel")).toHaveLength(2);
  });

  it("renders the resize handle between panels on desktop", () => {
    mockUseMediaQuery.mockReturnValue(false);
    render(
      <BuilderLayout chatPanel={chatContent} previewPanel={previewContent} />
    );
    expect(screen.getByTestId("handle")).toBeInTheDocument();
  });

  it("renders stacked layout without resize handle on mobile", () => {
    mockUseMediaQuery.mockReturnValue(true);
    render(
      <BuilderLayout chatPanel={chatContent} previewPanel={previewContent} />
    );
    expect(screen.getByText("Chat Panel")).toBeInTheDocument();
    expect(screen.getByText("Preview Panel")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-group")).not.toBeInTheDocument();
    expect(screen.queryByTestId("handle")).not.toBeInTheDocument();
  });
});
