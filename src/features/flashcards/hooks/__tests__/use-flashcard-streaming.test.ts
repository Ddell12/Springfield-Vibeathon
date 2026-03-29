import { renderHook, act } from "@testing-library/react";
import { useFlashcardStreaming } from "../use-flashcard-streaming";

// Helper: create a mock SSE stream from events
function createSSEStream(events: Array<{ event: string; data: Record<string, unknown> }>) {
  const text = events
    .map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}`)
    .join("\n\n") + "\n\n";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return stream;
}

function mockFetchWithEvents(events: Array<{ event: string; data: Record<string, unknown> }>) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      body: createSSEStream(events),
    }),
  );
}

describe("useFlashcardStreaming", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() => useFlashcardStreaming());
    expect(result.current.status).toBe("idle");
    expect(result.current.sessionId).toBeNull();
    expect(result.current.activityMessage).toBe("");
  });

  it("transitions to generating on generate()", async () => {
    mockFetchWithEvents([]);
    const { result } = renderHook(() => useFlashcardStreaming());

    await act(async () => {
      await result.current.generate("animal sounds");
    });

    // After stream completes with no events, stays generating
    // (since no status: live event was received)
    expect(result.current.status).toBe("generating");
  });

  it("sends correct request to /api/generate", async () => {
    mockFetchWithEvents([]);
    const { result } = renderHook(() => useFlashcardStreaming());

    await act(async () => {
      await result.current.generate("color cards");
    });

    expect(fetch).toHaveBeenCalledWith("/api/generate", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"mode":"flashcards"'),
    }));
  });

  it("sets sessionId from session event", async () => {
    mockFetchWithEvents([
      { event: "session", data: { sessionId: "sess_123" } },
    ]);
    const { result } = renderHook(() => useFlashcardStreaming());

    await act(async () => {
      await result.current.generate("test");
    });

    expect(result.current.sessionId).toBe("sess_123");
  });

  it("transitions to live on status event", async () => {
    mockFetchWithEvents([
      { event: "session", data: { sessionId: "sess_123" } },
      { event: "status", data: { status: "live" } },
    ]);
    const { result } = renderHook(() => useFlashcardStreaming());

    await act(async () => {
      await result.current.generate("test");
    });

    expect(result.current.status).toBe("live");
  });

  it("updates activity message from activity event", async () => {
    mockFetchWithEvents([
      { event: "activity", data: { type: "thinking", message: "Creating deck..." } },
    ]);
    const { result } = renderHook(() => useFlashcardStreaming());

    await act(async () => {
      await result.current.generate("test");
    });

    expect(result.current.activityMessage).toBe("Creating deck...");
  });

  it("transitions to failed on error event", async () => {
    mockFetchWithEvents([
      { event: "error", data: { message: "Rate limited" } },
    ]);
    const { result } = renderHook(() => useFlashcardStreaming());

    await act(async () => {
      await result.current.generate("test");
    });

    expect(result.current.status).toBe("failed");
    expect(result.current.activityMessage).toBe("Rate limited");
  });

  it("transitions to failed on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, body: null }),
    );
    const { result } = renderHook(() => useFlashcardStreaming());

    await act(async () => {
      await result.current.generate("test");
    });

    expect(result.current.status).toBe("failed");
    expect(result.current.activityMessage).toBe("Something went wrong. Please try again.");
  });

  it("resets to idle on reset()", async () => {
    mockFetchWithEvents([
      { event: "session", data: { sessionId: "sess_123" } },
      { event: "status", data: { status: "live" } },
    ]);
    const { result } = renderHook(() => useFlashcardStreaming());

    await act(async () => {
      await result.current.generate("test");
    });
    expect(result.current.status).toBe("live");

    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.sessionId).toBeNull();
    expect(result.current.activityMessage).toBe("");
  });

  it("does not set failed on AbortError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Object.assign(new Error("Aborted"), { name: "AbortError" })),
    );
    const { result } = renderHook(() => useFlashcardStreaming());

    await act(async () => {
      await result.current.generate("test");
    });

    // Should stay generating, not failed
    expect(result.current.status).toBe("generating");
  });

  it("passes existing sessionId to request", async () => {
    mockFetchWithEvents([]);
    const { result } = renderHook(() => useFlashcardStreaming());

    await act(async () => {
      await result.current.generate("more cards", "sess_existing" as any);
    });

    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body.sessionId).toBe("sess_existing");
  });
});
