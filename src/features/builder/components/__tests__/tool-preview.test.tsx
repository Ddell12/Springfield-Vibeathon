import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";

import { ToolPreview } from "../tool-preview";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("@/features/therapy-tools/components/tool-renderer", () => ({
  ToolRenderer: ({ config }: any) => (
    <div data-testid="tool-renderer">{config?.type}</div>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe("ToolPreview", () => {
  it("shows the empty state when no toolId is provided", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    render(<ToolPreview toolId={null} />);
    expect(
      screen.getByText("Your tool will appear here")
    ).toBeInTheDocument();
  });

  it("shows the loading state when query has not resolved", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    render(<ToolPreview toolId="abc123" />);
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
    expect(
      screen.queryByText("Your tool will appear here")
    ).not.toBeInTheDocument();
  });

  it("shows not-found message when tool is null", () => {
    vi.mocked(useQuery).mockReturnValue(null);
    render(<ToolPreview toolId="abc123" />);
    expect(screen.getByText("Tool not found")).toBeInTheDocument();
  });

  it("renders the tool via ToolRenderer when tool is loaded", () => {
    vi.mocked(useQuery).mockReturnValue({
      _id: "tool1",
      config: { type: "token-board" },
    });
    render(<ToolPreview toolId="tool1" />);
    expect(screen.getByTestId("tool-renderer")).toBeInTheDocument();
    expect(screen.getByText("token-board")).toBeInTheDocument();
  });

  it("passes the correct arguments to useQuery", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    render(<ToolPreview toolId="myToolId" />);
    expect(useQuery).toHaveBeenCalledWith(
      expect.anything(),
      { toolId: "myToolId" }
    );
  });
});
