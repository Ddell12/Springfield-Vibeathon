import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the AI SDK streamText
const mockStreamText = vi.fn();
vi.mock("ai", () => ({
  streamText: mockStreamText,
}));

// Mock the anthropic provider
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => ({ modelId: "claude-sonnet-4-20250514" })),
}));

// Mock the prompt module
vi.mock("@/features/builder-v2/lib/prompt", () => ({
  getPlanningSystemPrompt: vi.fn(() => "You are the design brain behind Bridges..."),
}));

describe("POST /api/chat/plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a streaming response for valid messages", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('0:"Design plan text"\n'));
        controller.close();
      },
    });

    mockStreamText.mockReturnValue({
      toTextStreamResponse: vi.fn(() => new Response(mockStream)),
    });

    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/chat/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Build a token board" }],
      }),
    });

    const response = await POST(req);
    expect(response).toBeInstanceOf(Response);
    expect(response.status).not.toBe(400);
  });

  it("calls streamText with messages and planning system prompt", async () => {
    const mockStream = new ReadableStream({ start(c) { c.close(); } });
    mockStreamText.mockReturnValue({
      toTextStreamResponse: vi.fn(() => new Response(mockStream)),
    });

    const { POST } = await import("../route");

    const messages = [
      { role: "user", content: "Visual schedule for a 5-year-old with autism" },
    ];

    const req = new Request("http://localhost/api/chat/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    await POST(req);

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user" }),
        ]),
        system: expect.stringContaining("Bridges"),
      })
    );
  });

  it("returns 400 when messages array is empty", async () => {
    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/chat/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when messages field is missing", async () => {
    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/chat/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("uses the planning system prompt", async () => {
    const mockStream = new ReadableStream({ start(c) { c.close(); } });
    mockStreamText.mockReturnValue({
      toTextStreamResponse: vi.fn(() => new Response(mockStream)),
    });

    const { getPlanningSystemPrompt } = await import("@/features/builder-v2/lib/prompt");
    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/chat/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Token board for 5-year-old" }],
      }),
    });

    await POST(req);
    expect(getPlanningSystemPrompt).toHaveBeenCalled();
  });

  it("does not accept a context field (planning has no context)", async () => {
    const mockStream = new ReadableStream({ start(c) { c.close(); } });
    mockStreamText.mockReturnValue({
      toTextStreamResponse: vi.fn(() => new Response(mockStream)),
    });

    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/chat/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Token board" }],
        context: "Some context",
      }),
    });

    // Should succeed — context is simply ignored for plan route
    const response = await POST(req);
    expect(response.status).not.toBe(400);
  });
});
