// src/features/builder/components/__tests__/chat-panel.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const mockUseQuery = vi.fn().mockReturnValue([]);
vi.mock("convex/react", () => ({
  useQuery: mockUseQuery,
  useMutation: vi.fn().mockReturnValue(vi.fn()),
  useAction: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Sam", lastName: "Lee" } }),
}));

vi.mock("../../hooks/use-streaming", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../hooks/use-streaming")>();
  return {
    ...actual,
    useStreaming: vi.fn().mockReturnValue({
      status: "idle",
      files: [],
      generate: vi.fn(),
      blueprint: null,
      error: null,
      sessionId: null,
    }),
  };
});

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="icon">{icon}</span>,
}));

vi.mock("../blueprint-card", () => ({
  BlueprintCard: ({ blueprint }: any) => <div>{blueprint.title}</div>,
}));

import { ChatPanel } from "../chat-panel";

const defaultProps = {
  sessionId: null as string | null,
  status: "idle" as const,
  blueprint: null as Record<string, unknown> | null,
  error: null as string | null,
  streamingText: "",
  activities: [] as { id: string; type: "thinking" | "writing_file" | "file_written" | "complete"; message: string; path?: string; timestamp: number }[],
  appTitle: "Untitled App",
};

describe("ChatPanel — message rendering", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders without crashing", () => {
    render(<ChatPanel {...defaultProps} />);
  });

  it("shows user messages with avatar initials", () => {
    mockUseQuery.mockReturnValue([
      { _id: "msg1", role: "user", content: "Build a token board", timestamp: 1 },
    ]);
    render(<ChatPanel {...defaultProps} sessionId="session_123" />);
    expect(screen.getByText("Build a token board")).toBeInTheDocument();
    expect(screen.getByText("SL")).toBeInTheDocument(); // Sam Lee initials
    mockUseQuery.mockReturnValue([]);
  });

  it("shows assistant messages without a bubble wrapper", () => {
    mockUseQuery.mockReturnValue([
      { _id: "msg2", role: "assistant", content: "I'll build your token board now.", timestamp: 2 },
    ]);
    render(<ChatPanel {...defaultProps} sessionId="session_123" />);
    expect(screen.getByText(/build your token board/i)).toBeInTheDocument();
    mockUseQuery.mockReturnValue([]);
  });

  it("shows blueprint card when blueprint is provided", () => {
    render(
      <ChatPanel
        {...defaultProps}
        blueprint={{ title: "Token Reward Board", therapyGoal: "Positive reinforcement" }}
      />
    );
    expect(screen.getByText(/Token Reward Board/)).toBeInTheDocument();
  });

  it("shows ArtifactCard with app title when status is generating", () => {
    render(<ChatPanel {...defaultProps} status="generating" appTitle="AAC Board" />);
    expect(screen.getByText("AAC Board")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows ArtifactCard while bundling", () => {
    render(<ChatPanel {...defaultProps} status="bundling" appTitle="AAC Board" />);
    expect(screen.getByText("AAC Board")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows ArtifactCard without spinner when status is live", () => {
    render(<ChatPanel {...defaultProps} status="live" appTitle="AAC Board" />);
    expect(screen.getByText("AAC Board")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows soft error message when error is set", () => {
    render(<ChatPanel {...defaultProps} error="Claude API unavailable" />);
    expect(screen.getByText(/we hit a small bump/i)).toBeInTheDocument();
    expect(screen.queryByText(/Claude API unavailable/i)).not.toBeInTheDocument();
  });

  it("shows Retry button when error is set and onRetry is provided", () => {
    render(<ChatPanel {...defaultProps} error="Something went wrong" onRetry={vi.fn()} />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("does not show Retry button when onRetry is not provided", () => {
    render(<ChatPanel {...defaultProps} error="Something went wrong" />);
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("shows system messages", () => {
    mockUseQuery.mockReturnValue([
      { _id: "msg1", role: "system", content: "Session started", timestamp: 1 },
    ]);
    render(<ChatPanel {...defaultProps} sessionId="session_123" />);
    expect(screen.getByText("Session started")).toBeInTheDocument();
    mockUseQuery.mockReturnValue([]);
  });

  it("does NOT render an input form", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
