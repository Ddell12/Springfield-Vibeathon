// src/features/builder/components/__tests__/builder-page.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const mockGet = vi.fn().mockReturnValue(null);
const mockReplace = vi.fn();
const mockPush = vi.fn();
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
  PreviewColumn: () => <div data-testid="preview-column" />,
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
    mockStreamingState.status = "idle";
  });

  it("renders without crashing", () => {
    render(<BuilderPage initialSessionId={null} />);
  });

  it("shows HomeScreen when status is idle and no session", () => {
    render(<BuilderPage initialSessionId={null} />);
    expect(screen.getByTestId("home-screen")).toBeInTheDocument();
  });

  it("does NOT render a BuilderToolbar", () => {
    render(<BuilderPage initialSessionId={null} />);
    expect(screen.queryByRole("link", { name: /back to dashboard/i })).not.toBeInTheDocument();
  });
});
