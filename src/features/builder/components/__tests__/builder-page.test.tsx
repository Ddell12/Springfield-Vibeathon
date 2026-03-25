// src/features/builder/components/__tests__/builder-page.test.tsx
import { render, screen } from "@testing-library/react";
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
}));

// Mock the streaming hook
vi.mock("../../hooks/use-streaming", () => ({
  useStreaming: vi.fn().mockReturnValue({
    status: "idle",
    files: [],
    generate: vi.fn(),
    blueprint: null,
    error: null,
    sessionId: null,
    streamingText: "",
    activities: [],
    previewUrl: null,
  }),
}));

// Mock the WebContainer hook
vi.mock("../../hooks/use-webcontainer", () => ({
  useWebContainer: vi.fn().mockReturnValue({
    status: "booting",
    previewUrl: null,
    error: null,
    writeFile: vi.fn(),
  }),
}));

import { BuilderPage } from "../builder-page";

describe("BuilderPage — three-panel layout", () => {
  it("renders without crashing", () => {
    render(<BuilderPage />);
  });

  it("renders at least 2 resizable panels in default preview mode", () => {
    render(<BuilderPage />);
    // Default viewMode is "preview" which shows chat + preview (2 panels)
    const panels = document.querySelectorAll("[data-panel]");
    expect(panels.length).toBeGreaterThanOrEqual(2);
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

  it("shows preview panel area with loading state when idle + booting", () => {
    const { container } = render(<BuilderPage />);
    // Preview panel shows a skeleton pulse when WebContainer is booting
    const pulse = container.querySelector(".animate-pulse");
    expect(pulse).toBeTruthy();
  });

  it("renders without crashing when sessionId is in URL", () => {
    mockGet.mockReturnValue("test_session_123");
    render(<BuilderPage />);
    // Should not crash when a sessionId is provided
    mockGet.mockReturnValue(null);
  });

  it("renders the builder toolbar", () => {
    render(<BuilderPage />);
    // Toolbar should show the project name (may appear in multiple spots)
    expect(screen.getAllByText("Untitled App").length).toBeGreaterThan(0);
  });
});
