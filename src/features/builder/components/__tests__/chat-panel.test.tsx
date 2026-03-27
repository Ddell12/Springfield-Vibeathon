// src/features/builder/components/__tests__/chat-panel.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

// jsdom doesn't implement scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Module-level mock so vi.fn() references can be captured
const mockUseQuery = vi.fn().mockReturnValue([]);
const mockUseMutation = vi.fn().mockReturnValue(vi.fn());

vi.mock("convex/react", () => ({
  useQuery: mockUseQuery,
  useMutation: mockUseMutation,
  useAction: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock("../../hooks/use-streaming", () => ({
  useStreaming: vi.fn().mockReturnValue({
    status: "idle",
    files: [],
    generate: vi.fn(),
    blueprint: null,
    error: null,
    sessionId: null,
  }),
}));

import { ChatPanel } from "../chat-panel";

const defaultProps = {
  sessionId: null as string | null,
  status: "idle" as const,
  blueprint: null as Record<string, unknown> | null,
  error: null as string | null,
  onGenerate: vi.fn(),
  streamingText: "",
  activities: [] as { id: string; type: "thinking" | "writing_file" | "file_written" | "complete"; message: string; path?: string; timestamp: number }[],
};

describe("ChatPanel — streaming builder contract", () => {
  it("renders without crashing", () => {
    render(<ChatPanel {...defaultProps} />);
  });

  it("shows a text input for user prompt", () => {
    render(<ChatPanel {...defaultProps} />);
    const input = screen.getByRole("textbox");
    expect(input).toBeTruthy();
  });

  it("shows messages when provided via useQuery", () => {
    mockUseQuery.mockReturnValue([
      { _id: "msg1", role: "user", content: "Build a token board", timestamp: 1 },
      { _id: "msg2", role: "assistant", content: "I'm building your token board app!", timestamp: 2 },
    ]);

    render(<ChatPanel {...defaultProps} sessionId={"session_123"} />);
    expect(screen.getByText("Build a token board")).toBeTruthy();
    expect(screen.getByText(/building your token board/i)).toBeTruthy();

    // Reset for subsequent tests
    mockUseQuery.mockReturnValue([]);
  });

  it("shows blueprint info card when blueprint is provided", () => {
    render(
      <ChatPanel
        {...defaultProps}
        blueprint={{
          title: "Token Reward Board",
          therapyGoal: "Positive reinforcement",
          targetUser: "ABA therapy, ages 4-8",
        }}
      />
    );
    expect(screen.getByText(/Token Reward Board/)).toBeTruthy();
  });

  it("blueprint info card does NOT show approval buttons", () => {
    render(
      <ChatPanel
        {...defaultProps}
        blueprint={{
          title: "Token Reward Board",
          therapyGoal: "Positive reinforcement",
        }}
      />
    );
    // Streaming builder starts generation immediately — no approval gate
    expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /reject|deny/i })).toBeNull();
  });

  it("shows generating status indicator when status is 'generating'", () => {
    render(<ChatPanel {...defaultProps} status="generating" />);
    const indicator =
      screen.queryByText(/generating|building|thinking/i) ??
      document.querySelector(".animate-pulse, .animate-spin");
    expect(indicator).toBeTruthy();
  });

  it("shows error message when error is set", () => {
    render(
      <ChatPanel
        {...defaultProps}
        status="failed"
        error="Claude API unavailable"
      />
    );
    expect(screen.getByText(/Claude API unavailable/i)).toBeTruthy();
  });

  it("input is disabled when status is 'generating'", () => {
    render(<ChatPanel {...defaultProps} status="generating" />);
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement | HTMLTextAreaElement).disabled).toBe(true);
  });

  it("input is enabled when status is 'idle'", () => {
    render(<ChatPanel {...defaultProps} status="idle" />);
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement | HTMLTextAreaElement).disabled).toBe(false);
  });

  it("shows 'live' or 'ready' indicator when status is 'live'", () => {
    render(<ChatPanel {...defaultProps} status="live" />);
    const indicator = screen.queryByText(/live|ready|done/i);
    expect(indicator).toBeTruthy();
  });

  it("shows Retry button when error is set and onRetry is provided", () => {
    render(
      <ChatPanel
        {...defaultProps}
        status="failed"
        error="Something went wrong"
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
  });

  it("does not show Retry button when onRetry is not provided", () => {
    render(
      <ChatPanel
        {...defaultProps}
        status="failed"
        error="Something went wrong"
      />
    );
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("shows system messages", () => {
    mockUseQuery.mockReturnValue([
      { _id: "msg1", role: "system", content: "Session started", timestamp: 1 },
    ]);
    render(<ChatPanel {...defaultProps} sessionId="session_123" />);
    expect(screen.getByText("Session started")).toBeTruthy();
    mockUseQuery.mockReturnValue([]);
  });

  it("shows starting indicator when generating with no activities or streaming text", () => {
    render(
      <ChatPanel
        {...defaultProps}
        status="generating"
      />
    );
    expect(screen.getByText(/Starting generation/)).toBeTruthy();
  });

  it("shows activity cards for file_written activities during generation", () => {
    render(
      <ChatPanel
        {...defaultProps}
        status="generating"
        activities={[
          {
            id: "a1",
            type: "file_written",
            message: "Wrote App.tsx",
            path: "src/App.tsx",
            timestamp: Date.now(),
          },
        ]}
      />
    );
    // FileBadges renders action and filename in separate spans
    expect(screen.getByText("Edited")).toBeTruthy();
    expect(screen.getByText("App.tsx")).toBeTruthy();
  });

  it("shows activity message during generation when activities present", () => {
    render(
      <ChatPanel
        {...defaultProps}
        status="generating"
        activities={[
          {
            id: "a1",
            type: "thinking",
            message: "Understanding request",
            timestamp: Date.now(),
          },
        ]}
      />
    );
    // Activity message is shown directly (no type-based labels)
    expect(screen.getByText("Understanding request")).toBeTruthy();
  });

  it("shows input placeholder for live status", () => {
    render(<ChatPanel {...defaultProps} status="live" />);
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).placeholder).toMatch(/changes/i);
  });

  it("shows input placeholder for idle status", () => {
    render(<ChatPanel {...defaultProps} status="idle" />);
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).placeholder).toMatch(/describe|build/i);
  });
});
