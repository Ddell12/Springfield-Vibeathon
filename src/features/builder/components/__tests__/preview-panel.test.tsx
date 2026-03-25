// src/features/builder/components/__tests__/preview-panel.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PreviewPanel } from "../preview-panel";

// Props shape after WebContainer refactor:
// PreviewPanel({ previewUrl, state, wcStatus, error })
// - previewUrl: string | null — from WebContainer, not session
// - state: streaming state from useStreaming
// - wcStatus: "booting" | "installing" | "ready" | "error"
// - error: string | undefined

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
    // src is set (truthy) — does NOT need to be an e2b domain
    expect((iframe as HTMLIFrameElement).src).toBeTruthy();
  });

  it("wcStatus='booting' renders 'Booting' text", () => {
    render(<PreviewPanel previewUrl={null} state="idle" wcStatus="booting" />);
    expect(screen.getByText(/booting/i)).toBeTruthy();
  });

  it("wcStatus='installing' renders 'Installing' text", () => {
    render(<PreviewPanel previewUrl={null} state="generating" wcStatus="installing" />);
    expect(screen.getByText(/installing/i)).toBeTruthy();
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
        wcStatus="installing"
      />
    );
    const spinner =
      screen.queryByRole("status") ??
      screen.queryByText(/generating|building|creating|installing/i) ??
      document.querySelector(".animate-pulse, .animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("shows empty state when no previewUrl and state is 'idle'", () => {
    render(
      <PreviewPanel
        previewUrl={null}
        state="idle"
        wcStatus="booting"
      />
    );
    expect(screen.getByText(/booting preview environment/i)).toBeTruthy();
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

  it("renders responsive size toggle buttons when live", () => {
    render(
      <PreviewPanel
        previewUrl="http://localhost:5173"
        state="live"
        wcStatus="ready"
      />
    );
    expect(screen.getByRole("button", { name: /mobile/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /desktop/i })).toBeTruthy();
  });
});
