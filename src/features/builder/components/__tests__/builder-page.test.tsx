// src/features/builder/components/__tests__/builder-page.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMutation } from "convex/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const mockGet = vi.fn().mockReturnValue(null);
const mockReplace = vi.fn();
const mockPush = vi.fn();
const mockToast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
}));
const mockStreamingState = {
  status: "idle" as const,
  files: [],
  generate: vi.fn(),
  resumeSession: vi.fn(),
  blueprint: null,
  appName: null,
  error: null,
  sessionId: null,
  streamingText: "",
  activities: [],
  bundleHtml: null,
  buildFailed: false,
  notableMessage: null,
  reset: vi.fn(),
};

vi.mock("sonner", () => ({
  toast: mockToast,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGet }),
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn().mockReturnValue(undefined),
  useMutation: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(null)),
  useAction: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(null)),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Sam", lastName: "Lee" } }),
}));

vi.mock("@/core/hooks/use-mobile", () => ({
  useIsMobile: vi.fn().mockReturnValue(false),
}));

vi.mock("../../hooks/use-session-resume", () => ({
  useSessionResume: vi.fn(() => ({
    activeSessionId: "session_123",
    currentSession: null,
    appRecord: { shareSlug: "existing-share" },
    handlePromptFromUrl: vi.fn(),
  })),
}));

const mockResumeSession = vi.fn();
vi.mock("../../hooks/use-streaming", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../hooks/use-streaming")>();
  return {
    ...actual,
    useStreaming: vi.fn(() => ({
      ...mockStreamingState,
      resumeSession: mockResumeSession,
    })),
  };
});

vi.mock("../home-screen", () => ({
  HomeScreen: () => <div data-testid="home-screen" />,
}));

vi.mock("../chat-column", () => ({
  ChatColumn: () => <div data-testid="chat-column" />,
}));

vi.mock("../preview-column", () => ({
  PreviewColumn: ({ onPublish }: { onPublish?: () => void }) => (
    <button type="button" onClick={onPublish}>
      Share & Publish
    </button>
  ),
}));

vi.mock("@/shared/components/share-dialog", () => ({
  ShareDialog: () => null,
}));

vi.mock("@/shared/components/fullscreen-app-view", () => ({
  FullscreenAppView: () => null,
}));

import { BuilderPage } from "../builder-page";

describe("BuilderPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStreamingState.status = "live";
    vi.mocked(useMutation).mockReturnValue(vi.fn().mockResolvedValue(null) as never);
  });

  it("renders without crashing", () => {
    render(<BuilderPage initialSessionId={null} />);
  });

  it("shows HomeScreen when status is idle and no session", () => {
    mockStreamingState.status = "idle";
    render(<BuilderPage initialSessionId={null} />);
    expect(screen.getByTestId("home-screen")).toBeInTheDocument();
  });

  it("does NOT render a BuilderToolbar", () => {
    render(<BuilderPage initialSessionId={null} />);
    expect(screen.queryByRole("link", { name: /back to dashboard/i })).not.toBeInTheDocument();
  });

  it("opens upgrade flow instead of generic share failure when free-tier save is blocked", async () => {
    const ensureApp = vi.fn().mockRejectedValue(
      new Error("Free plan limit reached. Upgrade to Premium for unlimited apps."),
    );
    vi.mocked(useMutation).mockReturnValue(ensureApp as never);

    render(<BuilderPage initialSessionId={null} />);

    await userEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /upgrade to premium/i })).toBeInTheDocument();
    });
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it("keeps the generic share error path for non-limit failures", async () => {
    const ensureApp = vi.fn().mockRejectedValue(new Error("Network request failed"));
    vi.mocked(useMutation).mockReturnValue(ensureApp as never);

    render(<BuilderPage initialSessionId={null} />);

    await userEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Could not create share link");
    });
    expect(screen.queryByRole("dialog", { name: /upgrade to premium/i })).not.toBeInTheDocument();
  });
});
