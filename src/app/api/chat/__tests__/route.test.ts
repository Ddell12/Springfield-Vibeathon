import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the AI SDK streamText
const mockStreamText = vi.fn();
vi.mock("ai", () => ({
  streamText: mockStreamText,
}));

// Mock the anthropic provider
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => ({ modelId: "claude-sonnet-4-5" })),
}));

// Mock the prompt module
vi.mock("@/features/builder-v2/lib/prompt", () => ({
  getInterviewSystemPrompt: vi.fn(() => "You are a therapy assistant."),
}));

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a streaming response for valid messages", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: hello\n\n"));
        controller.close();
      },
    });

    mockStreamText.mockReturnValue({
      toTextStreamResponse: vi.fn(() => new Response(mockStream)),
    });

    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "I need a morning routine app" }],
      }),
    });

    const response = await POST(req);
    expect(response).toBeInstanceOf(Response);
    expect(response.status).not.toBe(400);
  });

  it("calls streamText with the messages", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.close();
      },
    });

    mockStreamText.mockReturnValue({
      toTextStreamResponse: vi.fn(() => new Response(mockStream)),
    });

    const { POST } = await import("../route");

    const messages = [
      { role: "user", content: "Build me a token board" },
    ];

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    await POST(req);

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "Build me a token board" }),
        ]),
      })
    );
  });

  it("returns 400 when messages array is empty", async () => {
    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when messages field is missing", async () => {
    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("uses the interview system prompt", async () => {
    const mockStream = new ReadableStream({ start(c) { c.close(); } });
    mockStreamText.mockReturnValue({
      toTextStreamResponse: vi.fn(() => new Response(mockStream)),
    });

    const { getInterviewSystemPrompt } = await import("@/features/builder-v2/lib/prompt");
    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    await POST(req);
    expect(getInterviewSystemPrompt).toHaveBeenCalled();
  });
});
