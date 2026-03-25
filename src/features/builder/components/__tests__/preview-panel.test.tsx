// src/features/builder/components/__tests__/preview-panel.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PreviewPanel } from "../preview-panel";

describe("PreviewPanel — streaming builder contract", () => {
  it("renders without crashing with null session", () => {
    render(<PreviewPanel session={null} />);
  });

  it("shows iframe when previewUrl is set", () => {
    render(
      <PreviewPanel
        session={{
          previewUrl: "https://abc123.e2b.app",
          state: "live",
        }}
      />
    );
    const iframe = screen.getByTitle(/preview/i);
    expect(iframe).toBeTruthy();
    expect((iframe as HTMLIFrameElement).src).toContain("abc123.e2b.app");
  });

  it("shows generating spinner when state is 'generating'", () => {
    render(
      <PreviewPanel
        session={{
          previewUrl: undefined,
          state: "generating",
        }}
      />
    );
    // Should show a loading/generating indicator
    const spinner =
      screen.queryByRole("status") ??
      screen.queryByText(/generating|building|creating/i) ??
      document.querySelector(".animate-pulse, .animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("shows empty state when no previewUrl and state is 'idle'", () => {
    render(
      <PreviewPanel
        session={{
          previewUrl: undefined,
          state: "idle",
        }}
      />
    );
    // Should show placeholder text telling user preview will appear here
    expect(screen.getByText(/preview will appear/i)).toBeTruthy();
  });

  it("shows empty state when session is null", () => {
    render(<PreviewPanel session={null} />);
    expect(screen.getByText(/preview will appear/i)).toBeTruthy();
  });

  it("shows failed state message when state is 'failed'", () => {
    render(
      <PreviewPanel
        session={{
          previewUrl: undefined,
          state: "failed",
          error: "Something went wrong",
        }}
      />
    );
    // Should surface the error to the user
    const errorIndicator =
      screen.queryByText(/failed|error|something went wrong/i);
    expect(errorIndicator).toBeTruthy();
  });

  it("does not show retry button — streaming restarts automatically", () => {
    render(
      <PreviewPanel
        session={{
          previewUrl: undefined,
          state: "failed",
        }}
      />
    );
    // The streaming builder auto-retries, no manual retry button needed
    const retryButton = screen.queryByRole("button", { name: /retry/i });
    expect(retryButton).toBeNull();
  });

  it("renders responsive size toggle buttons", () => {
    render(
      <PreviewPanel
        session={{
          previewUrl: "https://abc.e2b.app",
          state: "live",
        }}
      />
    );
    // Should have mobile/tablet/desktop toggle
    expect(screen.getByRole("button", { name: /mobile/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /desktop/i })).toBeTruthy();
  });
});
