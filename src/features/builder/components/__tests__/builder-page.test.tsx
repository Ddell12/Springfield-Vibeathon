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
    previewUrl: null,
    sessionId: null,
  }),
}));

import { BuilderPage } from "../builder-page";

describe("BuilderPage — three-panel layout", () => {
  it("renders without crashing", () => {
    render(<BuilderPage />);
  });

  it("renders 3 resizable panels", () => {
    render(<BuilderPage />);
    // The three panels are: chat, code, preview
    // Resizable panel wrappers use data-panel attribute
    const panels = document.querySelectorAll("[data-panel]");
    expect(panels.length).toBeGreaterThanOrEqual(3);
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

  it("passes streaming state to child panels — shows preview empty state when idle", () => {
    render(<BuilderPage />);
    // When idle with no files, preview should show empty state message
    expect(screen.getByText(/preview will appear/i)).toBeTruthy();
  });

  it("renders without crashing when sessionId is in URL", () => {
    mockGet.mockReturnValue("test_session_123");
    render(<BuilderPage />);
    // Should not crash when a sessionId is provided
    mockGet.mockReturnValue(null);
  });

  it("renders a code panel area", () => {
    render(<BuilderPage />);
    // Code panel should show an empty state or file list
    const codeIndicator =
      screen.queryByText(/code will appear|no files|start building/i) ??
      screen.queryByText(/App\.tsx/);
    expect(codeIndicator).toBeTruthy();
  });
});
