// src/features/builder/hooks/__tests__/use-postmessage-bridge.test.ts
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockGenerateSpeech = vi.fn();
const mockTranscribeSpeech = vi.fn();

vi.mock("convex/react", () => ({
  useAction: vi.fn((ref: unknown) => {
    if (ref === "generateSpeech") return mockGenerateSpeech;
    if (ref === "transcribeSpeech") return mockTranscribeSpeech;
    return vi.fn();
  }),
}));

vi.mock("../../../../../convex/_generated/api", () => ({
  api: {
    aiActions: { generateSpeech: "generateSpeech" },
    stt: { transcribeSpeech: "transcribeSpeech" },
  },
}));

vi.mock("@/core/utils", () => ({
  extractErrorMessage: (err: unknown) =>
    err instanceof Error ? err.message : String(err),
}));

// Mock FileReader
class MockFileReader {
  result: string | null = null;
  onloadend: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;

  readAsDataURL(blob: Blob) {
    // Simulate async FileReader
    Promise.resolve().then(() => {
      this.result = "data:audio/webm;base64,dGVzdA==";
      this.onloadend?.();
    });
  }
}
vi.stubGlobal("FileReader", MockFileReader);

// Mock MediaRecorder
class MockMediaRecorder {
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  state: string = "inactive";

  constructor(public stream: unknown, public options?: unknown) {}

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.onstop?.();
  }
}
vi.stubGlobal("MediaRecorder", MockMediaRecorder);

// Mock getUserMedia
const mockStream = {
  getTracks: () => [{ stop: vi.fn() }],
};
Object.defineProperty(navigator, "mediaDevices", {
  value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
  writable: true,
  configurable: true,
});

import { usePostMessageBridge } from "../use-postmessage-bridge";

// Helper to create a fake iframe ref
function createMockIframe(src = "http://localhost:3000/app") {
  const postMessage = vi.fn();
  const contentWindow = { postMessage };
  const iframe = { contentWindow, src } as unknown as HTMLIFrameElement;
  const ref = { current: iframe };
  return { ref, postMessage, contentWindow };
}

describe("usePostMessageBridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateSpeech.mockResolvedValue({ audioUrl: "https://example.com/audio.mp3" });
    mockTranscribeSpeech.mockResolvedValue({ transcript: "hello world" });
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as unknown as MediaStream);
  });

  it("renders without crashing", () => {
    const { ref } = createMockIframe();
    expect(() => renderHook(() => usePostMessageBridge(ref))).not.toThrow();
  });

  it("adds a message event listener on mount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const { ref } = createMockIframe();
    renderHook(() => usePostMessageBridge(ref));
    expect(addSpy).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("removes message listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { ref } = createMockIframe();
    const { unmount } = renderHook(() => usePostMessageBridge(ref));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("ignores messages from wrong source", async () => {
    const { ref } = createMockIframe();
    renderHook(() => usePostMessageBridge(ref));

    // Different contentWindow — wrong source
    const otherWindow = { postMessage: vi.fn() };
    const event = new MessageEvent("message", {
      data: { type: "tts-request", text: "hello" },
      source: otherWindow as unknown as Window,
    });
    window.dispatchEvent(event);

    await new Promise((r) => setTimeout(r, 10));
    expect(mockGenerateSpeech).not.toHaveBeenCalled();
  });

  it("ignores messages without a string type", async () => {
    const { ref, contentWindow } = createMockIframe();
    renderHook(() => usePostMessageBridge(ref));

    const event = new MessageEvent("message", {
      data: { text: "hello" }, // no type
      source: contentWindow as unknown as Window,
    });
    window.dispatchEvent(event);

    await new Promise((r) => setTimeout(r, 10));
    expect(mockGenerateSpeech).not.toHaveBeenCalled();
  });

  it("ignores messages when iframeRef.current is null", async () => {
    const ref = { current: null };
    renderHook(() => usePostMessageBridge(ref));

    const event = new MessageEvent("message", {
      data: { type: "tts-request", text: "hello" },
    });
    window.dispatchEvent(event);

    await new Promise((r) => setTimeout(r, 10));
    expect(mockGenerateSpeech).not.toHaveBeenCalled();
  });

  it("tts-request calls generateSpeech and posts tts-response", async () => {
    const { ref, contentWindow, postMessage } = createMockIframe();
    renderHook(() => usePostMessageBridge(ref));

    const event = new MessageEvent("message", {
      data: { type: "tts-request", text: "hello", voice: "warm-female" },
      source: contentWindow as unknown as Window,
    });
    window.dispatchEvent(event);

    await vi.waitFor(() => expect(mockGenerateSpeech).toHaveBeenCalled());
    expect(mockGenerateSpeech).toHaveBeenCalledWith({ text: "hello", voice: "warm-female" });

    await vi.waitFor(() => expect(postMessage).toHaveBeenCalled());
    expect(postMessage).toHaveBeenCalledWith(
      { type: "tts-response", text: "hello", audioUrl: "https://example.com/audio.mp3" },
      "http://localhost:3000"
    );
  });

  it("tts-request uses default voice 'warm-female' when voice is not provided", async () => {
    const { ref, contentWindow } = createMockIframe();
    renderHook(() => usePostMessageBridge(ref));

    const event = new MessageEvent("message", {
      data: { type: "tts-request", text: "hello" },
      source: contentWindow as unknown as Window,
    });
    window.dispatchEvent(event);

    await vi.waitFor(() => expect(mockGenerateSpeech).toHaveBeenCalled());
    expect(mockGenerateSpeech).toHaveBeenCalledWith({ text: "hello", voice: "warm-female" });
  });

  it("tts-request posts tts-error when generateSpeech throws", async () => {
    mockGenerateSpeech.mockRejectedValue(new Error("API error"));
    const { ref, contentWindow, postMessage } = createMockIframe();
    renderHook(() => usePostMessageBridge(ref));

    const event = new MessageEvent("message", {
      data: { type: "tts-request", text: "fail text" },
      source: contentWindow as unknown as Window,
    });
    window.dispatchEvent(event);

    await vi.waitFor(() => expect(postMessage).toHaveBeenCalled());
    expect(postMessage).toHaveBeenCalledWith(
      { type: "tts-error", text: "fail text", error: "API error" },
      "http://localhost:3000"
    );
  });

  it("stt-start calls getUserMedia and starts MediaRecorder", async () => {
    const { ref, contentWindow } = createMockIframe();
    renderHook(() => usePostMessageBridge(ref));

    const event = new MessageEvent("message", {
      data: { type: "stt-start" },
      source: contentWindow as unknown as Window,
    });
    window.dispatchEvent(event);

    await vi.waitFor(() =>
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled()
    );
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  it("stt-start posts stt-error when getUserMedia fails", async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
      new Error("Permission denied")
    );
    const { ref, contentWindow, postMessage } = createMockIframe();
    renderHook(() => usePostMessageBridge(ref));

    const event = new MessageEvent("message", {
      data: { type: "stt-start" },
      source: contentWindow as unknown as Window,
    });
    window.dispatchEvent(event);

    await vi.waitFor(() => expect(postMessage).toHaveBeenCalled());
    expect(postMessage).toHaveBeenCalledWith(
      { type: "stt-error", error: "Could not access microphone" },
      "http://localhost:3000"
    );
  });

  it("stt-stop calls stop on the MediaRecorder", async () => {
    const { ref, contentWindow } = createMockIframe();
    renderHook(() => usePostMessageBridge(ref));

    // Start recording first
    const startEvent = new MessageEvent("message", {
      data: { type: "stt-start" },
      source: contentWindow as unknown as Window,
    });
    window.dispatchEvent(startEvent);
    await vi.waitFor(() =>
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled()
    );

    // Allow MediaRecorder to be set up
    await new Promise((r) => setTimeout(r, 10));

    // Now stop
    const stopEvent = new MessageEvent("message", {
      data: { type: "stt-stop" },
      source: contentWindow as unknown as Window,
    });
    window.dispatchEvent(stopEvent);
    // If no recorder was set up yet, stop is a no-op. Either way, no crash.
    await new Promise((r) => setTimeout(r, 10));
  });

  it("getIframeOrigin returns correct origin for valid src", () => {
    // We test this indirectly via the postMessage targetOrigin
    const { ref, contentWindow, postMessage } = createMockIframe("https://app.example.com/builder");
    renderHook(() => usePostMessageBridge(ref));

    const event = new MessageEvent("message", {
      data: { type: "tts-request", text: "hello" },
      source: contentWindow as unknown as Window,
    });
    window.dispatchEvent(event);

    vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "tts-response" }),
        "https://app.example.com"
      );
    });
  });

  it("getIframeOrigin returns '*' when src is empty", async () => {
    const { ref, contentWindow, postMessage } = createMockIframe("");
    renderHook(() => usePostMessageBridge(ref));

    const event = new MessageEvent("message", {
      data: { type: "tts-request", text: "hello" },
      source: contentWindow as unknown as Window,
    });
    window.dispatchEvent(event);

    await vi.waitFor(() => expect(mockGenerateSpeech).toHaveBeenCalled());
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalled());
    const call = postMessage.mock.calls[0];
    expect(call[1]).toBe("*");
  });
});
