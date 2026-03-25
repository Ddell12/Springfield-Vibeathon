import { render, screen } from "@testing-library/react";

import { BuilderPage } from "../builder-page";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

// ResizablePanelGroup uses ResizeObserver which is not in jsdom
vi.mock("@/shared/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-group">{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-panel">{children}</div>
  ),
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown">{children}</div>
  ),
}));

vi.mock("prism-react-renderer", () => ({
  Highlight: ({ children, code }: { children: (args: unknown) => React.ReactNode; code: string }) =>
    children({
      style: {},
      tokens: [[{ content: code, types: ["plain"] }]],
      getLineProps: () => ({}),
      getTokenProps: () => ({}),
    }),
  themes: { nightOwl: {} },
}));

// Mock all hooks used across builder components
vi.mock("../../hooks/use-session", () => ({
  useSession: vi.fn(() => null),
  useSessionPhases: vi.fn(() => null),
  useSessionMessages: vi.fn(() => null),
  useSessionFiles: vi.fn(() => null),
  useBlueprint: vi.fn(() => null),
}));

import { useSession, useSessionPhases } from "../../hooks/use-session";

describe("BuilderPage", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue(null);
    vi.mocked(useSessionPhases).mockReturnValue(null);
  });

  it("renders without crashing", () => {
    render(<BuilderPage />);
    // Suspense fallback or inner content should render
    expect(document.body).toBeTruthy();
  });

  it("renders three resizable panels via ResizablePanelGroup", () => {
    render(<BuilderPage />);
    // The ResizablePanelGroup wraps ChatPanel, CodePanel, PreviewPanel
    // Check for the chat panel's placeholder text
    expect(
      screen.getByText("What does your child need?")
    ).toBeInTheDocument();
    // Check for code panel empty state
    expect(
      screen.getByText("Files will appear here as your app is built.")
    ).toBeInTheDocument();
    // Check for preview panel placeholder
    expect(
      screen.getByText("Your tool will appear here")
    ).toBeInTheDocument();
  });

  it("hides PhaseTimeline when there are no phases", () => {
    vi.mocked(useSessionPhases).mockReturnValue(null);
    render(<BuilderPage />);
    // Phase timeline renders phase segments — without phases none should exist
    expect(document.querySelector(".group.relative.flex-1")).toBeNull();
  });

  it("renders PhaseTimeline when phases exist", () => {
    const mockPhases = [
      { _id: "p1", name: "Foundation", status: "completed", index: 0 },
      { _id: "p2", name: "Features", status: "generating", index: 1 },
    ];
    vi.mocked(useSessionPhases).mockReturnValue(mockPhases as ReturnType<typeof useSessionPhases>);
    vi.mocked(useSession).mockReturnValue({
      _id: "s1" as ReturnType<typeof useSession>["_id"],
      currentPhaseIndex: 1,
      state: "generating",
    } as ReturnType<typeof useSession>);

    render(<BuilderPage />);
    // Phase names should appear in the timeline
    expect(screen.getByText("Foundation")).toBeInTheDocument();
    expect(screen.getByText("Features")).toBeInTheDocument();
  });
});
