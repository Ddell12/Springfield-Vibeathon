// src/features/builder/components/__tests__/preview-panel.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeAll,describe, expect, it, vi } from "vitest";

import { PreviewPanel } from "../preview-panel";

// Mock the TTS bridge — it requires ConvexProvider which isn't available in unit tests
vi.mock("../../hooks/use-tts-bridge", () => ({
  useTtsBridge: vi.fn(),
}));

beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => "blob:test-url");
  global.URL.revokeObjectURL = vi.fn();
});

describe("PreviewPanel — blob URL iframe", () => {
  it("renders iframe with src when bundleHtml is provided", () => {
    render(<PreviewPanel bundleHtml="<html><body>Hello</body></html>" state="live" />);
    const iframe = screen.getByTitle(/app preview/i);
    expect(iframe).toBeTruthy();
    expect((iframe as HTMLIFrameElement).src).toBeTruthy();
  });

  it("shows 'Creating your app...' spinner when generating and no preview", () => {
    render(<PreviewPanel bundleHtml={null} state="generating" />);
    expect(screen.getByText(/creating your app/i)).toBeTruthy();
  });

  it("shows 'Updating...' overlay when generating with existing preview", () => {
    render(<PreviewPanel bundleHtml="<html><body>v1</body></html>" state="generating" />);
    expect(screen.getByText(/updating/i)).toBeTruthy();
    // iframe is still rendered
    expect(screen.getByTitle(/app preview/i)).toBeTruthy();
  });

  it("shows soft error message when state is failed", () => {
    render(<PreviewPanel bundleHtml={null} state="failed" error="Build crashed" />);
    expect(screen.getByText(/something didn.t look right/i)).toBeTruthy();
    expect(screen.queryByText(/build crashed/i)).toBeNull();
  });

  it("shows default error message when failed without error prop", () => {
    render(<PreviewPanel bundleHtml={null} state="failed" />);
    expect(screen.getByText(/something didn.t look right/i)).toBeTruthy();
  });

  it("shows placeholder when idle with no preview", () => {
    render(<PreviewPanel bundleHtml={null} state="idle" />);
    expect(screen.getByText(/your app will appear here/i)).toBeTruthy();
  });

  it("mobile device size applies w-[390px] class to iframe", () => {
    const { container } = render(
      <PreviewPanel
        bundleHtml="<html><body>Hello</body></html>"
        state="live"
        deviceSize="mobile"
      />
    );
    const mobileIframe = container.querySelector(".w-\\[390px\\]");
    expect(mobileIframe).toBeTruthy();
  });

  it("does not render iframe when bundleHtml is null", () => {
    render(<PreviewPanel bundleHtml={null} state="idle" />);
    expect(screen.queryByTitle(/app preview/i)).toBeNull();
  });

  it("does not show retry button — errors are handled upstream", () => {
    render(<PreviewPanel bundleHtml={null} state="failed" />);
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("shows warm build-failed message without technical jargon", () => {
    render(<PreviewPanel bundleHtml={null} state="live" buildFailed={true} onRetry={vi.fn()} />);
    expect(screen.getByText(/something didn.t look right/i)).toBeTruthy();
    expect(screen.getByText(/want to try again/i)).toBeTruthy();
    expect(screen.queryByText(/build error/i)).toBeNull();
    expect(screen.queryByText(/code panel/i)).toBeNull();
  });
});
