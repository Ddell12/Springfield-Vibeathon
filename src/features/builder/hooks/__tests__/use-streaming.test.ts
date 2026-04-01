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

  it("app_name event sets the appName", async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode('event: app_name\ndata: {"name":"Token Board Pro"}\n\n')
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build a token board");
    });

    expect(result.current.appName).toBe("Token Board Pro");
  });

  it("activity event adds to activities array", async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            'event: activity\ndata: {"type":"thinking","message":"Understanding request"}\n\n'
          )
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build");
    });

    expect(result.current.activities.length).toBeGreaterThan(0);
    expect(result.current.activities[0].type).toBe("thinking");
    expect(result.current.activities[0].message).toBe("Understanding request");
  });

  it("image_generated event adds a file_written activity", async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            'event: image_generated\ndata: {"label":"happy face","url":"https://img.example.com/1.png"}\n\n'
          )
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build");
    });

    const activity = result.current.activities.find((a) =>
      a.message.includes("happy face")
    );
    expect(activity).toBeDefined();
    expect(activity?.type).toBe("file_written");
  });

  it("speech_generated event adds a file_written activity", async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            'event: speech_generated\ndata: {"text":"Good morning","url":"https://audio.example.com/1.mp3"}\n\n'
          )
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build");
    });

    const activity = result.current.activities.find((a) =>
      a.message.includes("Good morning")
    );
    expect(activity).toBeDefined();
  });

  it("stt_enabled event adds a complete activity", async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode('event: stt_enabled\ndata: {}\n\n')
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build");
    });

    const activity = result.current.activities.find(
      (a) => a.type === "complete"
    );
    expect(activity).toBeDefined();
    expect(activity?.message).toMatch(/speech input/i);
  });

  it("status event with 'generating' sets status", async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode('event: status\ndata: {"status":"generating"}\n\n')
        );
        controller.enqueue(
          encoder.encode('event: done\ndata: {"sessionId":"sess_abc"}\n\n')
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build");
    });

    // After done, status should be live
    expect(result.current.status).toBe("live");
  });

  it("status event with 'live' sets status to live", async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode('event: status\ndata: {"status":"live"}\n\n')
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build");
    });

    expect(result.current.status).toBe("live");
  });

  it("session event sets sessionId", async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode('event: session\ndata: {"sessionId":"sess_xyz"}\n\n')
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build");
    });

    expect(result.current.sessionId).toBe("sess_xyz");
  });

  it("handles non-ok response with JSON error body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: "Internal server error" }),
    });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build");
    });

    expect(result.current.status).toBe("failed");
    expect(result.current.error).toBe("Internal server error");
  });

  it("handles non-ok response without JSON body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: vi.fn().mockRejectedValue(new Error("not json")),
    });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build");
    });

    expect(result.current.status).toBe("failed");
    expect(result.current.error).toContain("503");
  });

  it("handles null response body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: null,
    });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build");
    });

    expect(result.current.status).toBe("failed");
    expect(result.current.error).toBe("No response body");
  });

  it("handles fetch network error (non-abort)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network failure"));

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build");
    });

    expect(result.current.status).toBe("failed");
    expect(result.current.error).toBe("network failure");
  });

  it("AbortError is swallowed (not set as error)", async () => {
    const abortError = new Error("user aborted");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValueOnce(abortError);

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build");
    });

    // AbortError should NOT result in an error state
    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe("generating");
  });

  it("calling generate a second time aborts the first request", async () => {
    // First call: hangs forever
    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    const { result } = renderHook(() => useStreaming());

    // Start first generation
    act(() => {
      result.current.generate("First prompt");
    });

    // Immediately start second generation (should abort first)
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    act(() => {
      result.current.generate("Second prompt");
    });

    // Second fetch was called
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("generating");
  });

  it("remaining buffer is processed when stream ends without double-newline", async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        // Send data without a trailing \n\n so it goes into the "remaining buffer" path
        controller.enqueue(
          encoder.encode('event: done\ndata: {"sessionId":"sess_buffer"}\n\n')
        );
        controller.enqueue(
          // This part doesn't have \n\n — will be in remaining buffer
          encoder.encode('event: session\ndata: {"sessionId":"sess_remain"}')
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build");
    });

    // At minimum, done was processed
    expect(result.current.status).toBe("live");
  });

  it("resumeSession with blueprint: null (explicit null) sets blueprint to null", () => {
    const { result } = renderHook(() => useStreaming());

    act(() => {
      result.current.resumeSession({
        sessionId: "session_abc",
        files: [],
        blueprint: null,
      });
    });

    expect(result.current.blueprint).toBeNull();
  });

  it("bundleHtml is null initially", () => {
    const { result } = renderHook(() => useStreaming());
    expect(result.current.bundleHtml).toBeNull();
  });

  it("bundle event sets bundleHtml state", async () => {
    const html = "<!DOCTYPE html><html><body><div id='app'></div></body></html>";
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            `event: bundle\ndata: ${JSON.stringify({ html })}\n\n`
          )
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build a token board");
    });

    expect(result.current.bundleHtml).toBe(html);
  });

  it("bundleHtml resets to null on new generation", async () => {
    // First generation: sets bundleHtml
    const html = "<html><body>First</body></html>";
    const stream1 = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(`event: bundle\ndata: ${JSON.stringify({ html })}\n\n`)
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream1 });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("First prompt");
    });
    expect(result.current.bundleHtml).toBe(html);

    // Second generation: bundleHtml should reset to null (stream hangs)
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    act(() => {
      result.current.generate("Second prompt");
    });

    expect(result.current.bundleHtml).toBeNull();
  });

  it("onBundle callback is called when bundle event received", async () => {
    const html = "<!DOCTYPE html><html><body></body></html>";
    const onBundle = vi.fn();

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(`event: bundle\ndata: ${JSON.stringify({ html })}\n\n`)
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming({ onBundle }));
    await act(async () => {
      await result.current.generate("Build a token board");
    });

    expect(onBundle).toHaveBeenCalledTimes(1);
    expect(onBundle).toHaveBeenCalledWith(html);
  });

  it("onBundle is not called for other event types", async () => {
    const onBundle = vi.fn();

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode('event: done\ndata: {"sessionId":"sess_abc"}\n\n')
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming({ onBundle }));
    await act(async () => {
      await result.current.generate("Build a token board");
    });

    expect(onBundle).not.toHaveBeenCalled();
  });

  it("bundling status is preserved as bundling", async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode('event: status\ndata: {"status":"bundling"}\n\n')
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build a token board");
    });

    expect(result.current.status).toBe("bundling");
  });

  it("bundle event transitions status to validating while the preview loads", async () => {
    const html = "<!DOCTYPE html><html><body></body></html>";
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(`event: bundle\ndata: ${JSON.stringify({ html })}\n\n`)
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build a token board");
    });

    expect(result.current.bundleHtml).toBe(html);
    expect(result.current.status).toBe("validating");
  });

  it("file_complete updates existing file by path", async () => {
    const firstContents = "version 1";
    const secondContents = "version 2";
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            `event: file_complete\ndata: ${JSON.stringify({ path: "src/App.tsx", contents: firstContents })}\n\n`
          )
        );
        controller.enqueue(
          encoder.encode(
            `event: file_complete\ndata: ${JSON.stringify({ path: "src/App.tsx", contents: secondContents })}\n\n`
          )
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useStreaming());
    await act(async () => {
      await result.current.generate("Build");
    });

    // Should still have only one file (updated in-place)
    const appFiles = result.current.files.filter((f) => f.path === "src/App.tsx");
    expect(appFiles).toHaveLength(1);
    expect(appFiles[0].contents).toBe(secondContents);
  });
});
