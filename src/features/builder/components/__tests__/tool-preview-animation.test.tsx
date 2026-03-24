import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";

import { ToolPreview } from "../tool-preview";

// Capture motion.div props so we can assert on them
let capturedTransition: Record<string, unknown> | undefined;

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
    div: ({ children, transition, ...props }: any) => {
      // Capture the transition prop for assertion
      capturedTransition = transition;
      return (
        <div
          data-testid="motion-div"
          data-transition-duration={transition?.duration}
          {...props}
        >
          {children}
        </div>
      );
    },
  },
}));

describe("ToolPreview — animation duration", () => {
  beforeEach(() => {
    capturedTransition = undefined;
  });

  it("motion.div transition duration is 0.3 (not 0.2)", () => {
    vi.mocked(useQuery).mockReturnValue({
      _id: "tool1",
      config: { type: "token-board" },
    });

    render(<ToolPreview toolId="tool1" />);

    const motionDiv = screen.getByTestId("motion-div");
    expect(motionDiv).toBeInTheDocument();

    // Assert duration via data attribute (set by the mock)
    expect(motionDiv).toHaveAttribute("data-transition-duration", "0.3");
  });

  it("captured transition object has duration: 0.3", () => {
    vi.mocked(useQuery).mockReturnValue({
      _id: "tool1",
      config: { type: "token-board" },
    });

    render(<ToolPreview toolId="tool1" />);

    expect(capturedTransition).toBeDefined();
    expect(capturedTransition?.duration).toBe(0.3);
  });
});
