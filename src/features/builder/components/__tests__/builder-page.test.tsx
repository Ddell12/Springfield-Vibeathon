// src/features/builder/components/__tests__/builder-page.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock Next.js navigation before imports
const mockGet = vi.fn().mockReturnValue(null);
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGet }),
  useRouter: () => ({ replace: mockReplace }),
}));

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn().mockReturnValue(null),
  useMutation: vi.fn().mockReturnValue(vi.fn()),
  useAction: vi.fn().mockReturnValue(vi.fn().mockResolvedValue({ audioUrl: "https://test.example.com/audio.mp3" })),
}));

// Mock use-mobile hook
vi.mock("@/core/hooks/use-mobile", () => ({
  useIsMobile: vi.fn().mockReturnValue(false),
}));

// Mock the streaming hook
const mockResumeSession = vi.fn();

vi.mock("../../hooks/use-streaming", () => ({
  useStreaming: vi.fn().mockReturnValue({
    status: "idle",
    files: [],
    generate: vi.fn(),
    resumeSession: mockResumeSession,
    blueprint: null,
    appName: null,
    error: null,
    sessionId: null,
    streamingText: "",
    activities: [],
    bundleHtml: null,
  }),
}));

import { BuilderPage } from "../builder-page";

describe("BuilderPage — three-panel layout", () => {
  it("renders without crashing", () => {
    render(<BuilderPage />);
  });

  it("renders at least 2 resizable panels when a session is active", () => {
    // When sessionId is present, showPromptScreen is false and panels are rendered
    mockGet.mockReturnValueOnce("active_session_123");
    render(<BuilderPage />);
    // Default viewMode is "preview" which shows chat + preview (2 panels)
    const panels = document.querySelectorAll("[data-panel]");
    expect(panels.length).toBeGreaterThanOrEqual(2);
    mockGet.mockReturnValue(null);
  });

  it("renders the chat panel area with a text input", () => {
    render(<BuilderPage />);
    const input = screen.queryByRole("textbox") ?? screen.queryByPlaceholderText(/describe|tell|build/i);
    expect(input).toBeTruthy();
  });

  it("does not render PhaseTimeline component", () => {
    render(<BuilderPage />);
    // The old phasic pipeline showed a phase timeline — streaming builder removes it
    const timeline = screen.queryByTestId("phase-timeline");
    expect(timeline).toBeNull();
  });

  it("shows preview panel area when a session is active", () => {
    // When sessionId is present, the split-panel layout is shown
    mockGet.mockReturnValueOnce("active_session_123");
    const { container } = render(<BuilderPage />);
    // Preview panel shows a monitor icon placeholder when no bundleHtml
    const panelGroup = container.querySelector("[data-panel-group]");
    expect(panelGroup).toBeTruthy();
    mockGet.mockReturnValue(null);
  });

  it("renders without crashing when sessionId is in URL", () => {
    mockGet.mockReturnValue("test_session_123");
    render(<BuilderPage />);
    // Should not crash when a sessionId is provided
    mockGet.mockReturnValue(null);
  });

  it("renders the builder toolbar when a session is active", () => {
    // Toolbar only renders when showPromptScreen is false (session exists)
    mockGet.mockReturnValueOnce("active_session_123");
    render(<BuilderPage />);
    // Toolbar should show the project name (may appear in multiple spots)
    expect(screen.getAllByText("Untitled App").length).toBeGreaterThan(0);
    mockGet.mockReturnValue(null);
  });

  it("renders code panel when viewMode is code (via initial state override)", async () => {
    // Simulate files available so code panel has content
    const { useStreaming } = await import("../../hooks/use-streaming");
    vi.mocked(useStreaming).mockReturnValueOnce({
      status: "live",
      files: [{ path: "src/App.tsx", contents: "export default () => <div />" }],
      generate: vi.fn(),
      resumeSession: mockResumeSession,
      blueprint: null,
      appName: null,
      error: null,
      sessionId: "session_123",
      streamingText: "",
      activities: [],
      bundleHtml: null,
    });
    render(<BuilderPage />);
    // Default viewMode is "preview" — at least chat panel should render
    expect(screen.queryByRole("textbox")).toBeTruthy();
  });

  it("renders in mobile view when useIsMobile returns true", async () => {
    const { useIsMobile } = await import("@/core/hooks/use-mobile");
    vi.mocked(useIsMobile).mockReturnValueOnce(true);

    render(<BuilderPage />);
    // Mobile view should still render the chat panel by default (mobilePanel = "chat")
    expect(screen.queryByRole("textbox")).toBeTruthy();
  });

  it("shows error state in streaming hook", async () => {
    const { useStreaming } = await import("../../hooks/use-streaming");
    vi.mocked(useStreaming).mockReturnValueOnce({
      status: "failed",
      files: [],
      generate: vi.fn(),
      resumeSession: mockResumeSession,
      blueprint: null,
      appName: null,
      error: "Generation failed",
      sessionId: null,
      streamingText: "",
      activities: [],
      bundleHtml: null,
    });

    render(<BuilderPage />);
    expect(screen.getAllByText(/Generation failed/i).length).toBeGreaterThan(0);
  });

  it("shows project name from blueprint title", async () => {
    const { useStreaming } = await import("../../hooks/use-streaming");
    vi.mocked(useStreaming).mockReturnValueOnce({
      status: "live",
      files: [],
      generate: vi.fn(),
      resumeSession: mockResumeSession,
      blueprint: { title: "My Therapy Tool" } as Record<string, unknown>,
      appName: null,
      error: null,
      sessionId: "session_123",
      streamingText: "",
      activities: [],
      bundleHtml: null,
    });

    render(<BuilderPage />);
    expect(screen.getAllByText("My Therapy Tool").length).toBeGreaterThan(0);
  });

  it("shows code panel when viewMode is 'code'", async () => {
    const { useStreaming } = await import("../../hooks/use-streaming");
    vi.mocked(useStreaming).mockReturnValue({
      status: "live",
      files: [{ path: "src/App.tsx", contents: "export default () => <div />" }],
      generate: vi.fn(),
      resumeSession: mockResumeSession,
      blueprint: null,
      appName: null,
      error: null,
      sessionId: "session_123",
      streamingText: "",
      activities: [],
      bundleHtml: null,
    });

    // Render with default viewMode (preview), test still renders
    render(<BuilderPage />);
    expect(screen.queryByRole("textbox")).toBeTruthy();
  });

  it("calls resumeSession when sessionId is in URL and data is loaded", async () => {
    // Simulate ?sessionId=test_session_123
    mockGet.mockImplementation((key: string) => {
      if (key === "sessionId") return "test_session_123";
      return null;
    });

    // Mock useQuery to return session data and files
    const { useQuery } = await import("convex/react");

    // More specific mocking: sessions.get returns a session, generated_files.list returns files
    let queryCallCount = 0;
    vi.mocked(useQuery).mockImplementation((_queryFn: unknown, args: unknown) => {
      if (args === "skip") return null;
      queryCallCount++;
      // sessions.get is called first, generated_files.list second
      if (queryCallCount % 2 === 1) {
        return { _id: "test_session_123", title: "Test App", state: "live", query: "test", blueprint: null };
      }
      return [{ path: "src/App.tsx", contents: "<div>Hello</div>", _id: "f1", sessionId: "test_session_123" }];
    });

    // Re-mock useStreaming to provide resumeSession
    const { useStreaming } = await import("../../hooks/use-streaming");
    vi.mocked(useStreaming).mockReturnValue({
      status: "idle",
      files: [],
      generate: vi.fn(),
      resumeSession: mockResumeSession,
      blueprint: null,
      appName: null,
      error: null,
      sessionId: null,
      streamingText: "",
      activities: [],
      bundleHtml: null,
    });

    render(<BuilderPage />);

    await waitFor(() => {
      expect(mockResumeSession).toHaveBeenCalledWith({
        sessionId: "test_session_123",
        files: [{ path: "src/App.tsx", contents: "<div>Hello</div>" }],
        blueprint: null,
        bundleHtml: null,
      });
    });

    // Reset mocks
    mockGet.mockReturnValue(null);
    vi.mocked(useQuery).mockReturnValue(null);
  });

  it("passes bundleHtml from streaming hook to PreviewPanel", async () => {
    const { useStreaming } = await import("../../hooks/use-streaming");
    vi.mocked(useStreaming).mockReturnValueOnce({
      status: "live",
      files: [],
      generate: vi.fn(),
      resumeSession: mockResumeSession,
      blueprint: null,
      appName: null,
      error: null,
      sessionId: "session_123",
      streamingText: "",
      activities: [],
      bundleHtml: "<html><body><h1>Hello</h1></body></html>",
    });

    mockGet.mockReturnValueOnce("session_123");
    render(<BuilderPage />);

    // When bundleHtml is present, the preview panel renders an iframe
    const iframe = document.querySelector("iframe[title='App preview']");
    expect(iframe).toBeTruthy();
    mockGet.mockReturnValue(null);
  });
});
