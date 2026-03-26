// src/features/builder/hooks/__tests__/use-streaming.test.ts
import { act,renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TherapyBlueprint } from "../../lib/schemas";
import { useStreaming } from "../use-streaming";

// Mock fetch for SSE stream tests
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("useStreaming — streaming hook contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes in 'idle' state", () => {
    const { result } = renderHook(() => useStreaming());
    expect(result.current.status).toBe("idle");
  });

  it("files array is empty initially", () => {
    const { result } = renderHook(() => useStreaming());
    expect(result.current.files).toEqual([]);
  });

  it("generate is a function", () => {
    const { result } = renderHook(() => useStreaming());
    expect(typeof result.current.generate).toBe("function");
  });

  it("blueprint is null initially", () => {
    const { result } = renderHook(() => useStreaming());
    expect(result.current.blueprint).toBeNull();
  });

  it("error is null initially", () => {
    const { result } = renderHook(() => useStreaming());
    expect(result.current.error).toBeNull();
  });

  it("sessionId is null initially", () => {
    const { result } = renderHook(() => useStreaming());
    expect(result.current.sessionId).toBeNull();
  });

  it("calling generate sets status to 'generating'", async () => {
    // Mock a never-resolving fetch so we can check the in-progress state
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useStreaming());
    act(() => {
      result.current.generate("Build a token board for kids");
    });
    expect(result.current.status).toBe("generating");
  });

  it("calling generate clears previous error", async () => {
    // Set up: simulate a prior failed state by mocking fetch to reject
    mockFetch.mockRejectedValueOnce(new Error("network error"));
    const { result } = renderHook(() => useStreaming());

    // First call to create an error state
    await act(async () => {
      await result.current.generate("test").catch(() => {});
    });

    // Mock the second call to hang
    mockFetch.mockReturnValue(new Promise(() => {}));
    act(() => {
      result.current.generate("retry prompt");
    });

    expect(result.current.error).toBeNull();
  });

  it("status transitions from 'generating' to 'live' when done event received", async () => {
    // Simulate SSE stream that sends a done event (WebContainer handles preview, not the hook)
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode('event: done\ndata: {"sessionId":"sess_abc"}\n\n')
        );
        controller.close();
      },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: stream,
    });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build a token board");
    });

    expect(result.current.status).toBe("live");
  });

  it("files array is populated when file_complete events arrive", async () => {
    const fileContents = "export default function App() { return <div>Token Board</div>; }";
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            `event: file_complete\ndata: ${JSON.stringify({ path: "src/App.tsx", contents: fileContents })}\n\n`
          )
        );
        controller.close();
      },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: stream,
    });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build a token board");
    });

    expect(result.current.files.length).toBeGreaterThanOrEqual(1);
    const appFile = result.current.files.find((f) => f.path === "src/App.tsx");
    expect(appFile).toBeDefined();
    expect(appFile?.contents).toBe(fileContents);
  });

  it("error is set when SSE error event arrives", async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode('event: error\ndata: {"message":"Claude API unavailable"}\n\n')
        );
        controller.close();
      },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: stream,
    });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build a token board");
    });

    expect(result.current.error).toBe("Claude API unavailable");
    expect(result.current.status).toBe("failed");
  });

  it("onFileComplete callback is called when file_complete SSE event arrives", async () => {
    const fileContents = 'export default function App() { return <div>Hi</div>; }';
    const onFileComplete = vi.fn().mockResolvedValue(undefined);

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            `event: file_complete\ndata: ${JSON.stringify({ path: "src/App.tsx", contents: fileContents })}\n\n`
          )
        );
        controller.close();
      },
    });

    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming({ onFileComplete }));
    await act(async () => {
      await result.current.generate("Build a token board");
    });

    expect(onFileComplete).toHaveBeenCalledTimes(1);
    expect(onFileComplete).toHaveBeenCalledWith("src/App.tsx", fileContents);
  });

  it("onFileComplete is not called for other event types", async () => {
    const onFileComplete = vi.fn().mockResolvedValue(undefined);

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        // Send a blueprint event, not file_complete
        controller.enqueue(
          encoder.encode(
            'event: blueprint\ndata: {"data":{"title":"Token Board"}}\n\n'
          )
        );
        controller.close();
      },
    });

    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming({ onFileComplete }));
    await act(async () => {
      await result.current.generate("Build a token board");
    });

    expect(onFileComplete).not.toHaveBeenCalled();
  });

  it("useStreaming accepts no arguments (onFileComplete is optional)", () => {
    // Should not throw when called without options
    expect(() => renderHook(() => useStreaming())).not.toThrow();
    expect(() => renderHook(() => useStreaming({}))).not.toThrow();
  });

  it("resumeSession is a function", () => {
    const { result } = renderHook(() => useStreaming());
    expect(typeof result.current.resumeSession).toBe("function");
  });

  it("resumeSession sets sessionId, status to live, and files", () => {
    const { result } = renderHook(() => useStreaming());

    act(() => {
      result.current.resumeSession({
        sessionId: "session_abc",
        files: [{ path: "src/App.tsx", contents: "export default () => <div />" }],
      });
    });

    expect(result.current.sessionId).toBe("session_abc");
    expect(result.current.status).toBe("live");
    expect(result.current.files).toEqual([
      { path: "src/App.tsx", contents: "export default () => <div />" },
    ]);
  });

  it("resumeSession sets blueprint when provided", () => {
    const { result } = renderHook(() => useStreaming());

    const mockBlueprint = {
      title: "Morning Routine",
      description: "A visual schedule",
    } as unknown as TherapyBlueprint;

    act(() => {
      result.current.resumeSession({
        sessionId: "session_abc",
        files: [],
        blueprint: mockBlueprint,
      });
    });

    expect(result.current.blueprint).toEqual(mockBlueprint);
  });

  it("resumeSession does not trigger a network request", () => {
    const { result } = renderHook(() => useStreaming());

    act(() => {
      result.current.resumeSession({
        sessionId: "session_abc",
        files: [],
      });
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
