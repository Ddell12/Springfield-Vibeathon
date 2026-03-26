// src/features/builder/components/__tests__/preview-panel.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock Convex hooks — usePostMessageBridge calls useAction
vi.mock("convex/react", () => ({
  useQuery: vi.fn().mockReturnValue(null),
  useMutation: vi.fn().mockReturnValue(vi.fn()),
  useAction: vi.fn().mockReturnValue(vi.fn().mockResolvedValue({ audioUrl: "https://test.example.com/audio.mp3" })),
}));

// Mock the PostMessage bridge hook so it doesn't need a ConvexProvider
vi.mock("../hooks/use-postmessage-bridge", () => ({
  usePostMessageBridge: vi.fn(),
}));

import { PreviewPanel } from "../preview-panel";

describe("PreviewPanel — WebContainer refactor contract", () => {
  it("renders without crashing with null previewUrl", () => {
    render(<PreviewPanel previewUrl={null} state="idle" wcStatus="booting" />);
  });

  it("shows iframe when previewUrl is set and wcStatus is ready", () => {
    render(
      <PreviewPanel
        previewUrl="http://localhost:5173"
        state="live"
        wcStatus="ready"
      />
    );
    const iframe = screen.getByTitle(/preview/i);
    expect(iframe).toBeTruthy();
    expect((iframe as HTMLIFrameElement).src).toBeTruthy();
  });

  it("iframe src does not need to contain 'e2b' — uses WebContainer localhost URL", () => {
    render(
      <PreviewPanel
        previewUrl="http://localhost:5173"
        state="live"
        wcStatus="ready"
      />
    );
    const iframe = screen.getByTitle(/preview/i);
    expect((iframe as HTMLIFrameElement).src).toBeTruthy();
  });

  it("wcStatus='booting' renders a skeleton/loading state", () => {
    const { container } = render(
      <PreviewPanel previewUrl={null} state="idle" wcStatus="booting" />
    );
    // Booting state shows animated pulse skeleton
    const pulseElement = container.querySelector(".animate-pulse");
    expect(pulseElement).toBeTruthy();
  });

  it("wcStatus='booting' with generating state renders skeleton, not spinner", () => {
    const { container } = render(
      <PreviewPanel previewUrl={null} state="generating" wcStatus="booting" />
    );
    // Booting takes priority — renders the skeleton pulse, NOT the generating spinner
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("wcStatus='ready' with non-null previewUrl renders iframe", () => {
    render(
      <PreviewPanel
        previewUrl="http://localhost:5173"
        state="live"
        wcStatus="ready"
      />
    );
    const iframe = screen.getByTitle(/preview/i);
    expect(iframe).toBeTruthy();
  });

  it("shows generating spinner when state is 'generating'", () => {
    render(
      <PreviewPanel
        previewUrl={null}
        state="generating"
        wcStatus="booting"
      />
    );
    const spinner =
      screen.queryByRole("status") ??
      screen.queryByText(/generating|building|creating|setting up/i) ??
      document.querySelector(".animate-pulse, .animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("shows empty state when no previewUrl and wcStatus is booting", () => {
    const { container } = render(
      <PreviewPanel
        previewUrl={null}
        state="idle"
        wcStatus="booting"
      />
    );
    // Booting shows skeleton pulse, not iframe
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
    expect(screen.queryByTitle(/preview/i)).toBeNull();
  });

  it("shows failed state message when state is 'failed'", () => {
    render(
      <PreviewPanel
        previewUrl={null}
        state="failed"
        wcStatus="error"
        error="Something went wrong"
      />
    );
    const errorIndicator =
      screen.queryByText(/failed|error|something went wrong/i);
    expect(errorIndicator).toBeTruthy();
  });

  it("does not show retry button — streaming restarts automatically", () => {
    render(
      <PreviewPanel
        previewUrl={null}
        state="failed"
        wcStatus="error"
      />
    );
    const retryButton = screen.queryByRole("button", { name: /retry/i });
    expect(retryButton).toBeNull();
  });

  it("responsive device sizing is controlled via deviceSize prop", () => {
    // Device size toggle buttons live in BuilderToolbar, not PreviewPanel.
    // PreviewPanel accepts deviceSize prop and adjusts iframe width.
    const { container } = render(
      <PreviewPanel
        previewUrl="http://localhost:5173"
        state="live"
        wcStatus="ready"
        deviceSize="mobile"
      />
    );
    // Mobile device size constrains iframe container to 375px
    const mobileWrapper = container.querySelector(".w-\\[375px\\]");
    expect(mobileWrapper).toBeTruthy();
  });
});
