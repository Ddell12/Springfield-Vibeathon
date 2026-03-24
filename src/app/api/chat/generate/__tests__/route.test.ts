import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the AI SDK streamObject
const mockStreamObject = vi.fn();
vi.mock("ai", () => ({
  streamObject: mockStreamObject,
}));

// Mock the anthropic provider
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => ({ modelId: "claude-sonnet-4-5" })),
}));

// Mock the prompt module
vi.mock("@/features/builder-v2/lib/prompt", () => ({
  getCodeGenSystemPrompt: vi.fn((ctx?: string) =>
    ctx ? `Generate code for: ${ctx}` : "Generate therapy app code."
  ),
}));

// Mock the schema module
vi.mock("@/features/builder-v2/lib/schema", () => ({
  FragmentSchema: { _zod: true }, // placeholder — implementer uses real schema
}));

describe("POST /api/chat/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a streaming response for valid messages", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"title":"App"}\n\n'));
        controller.close();
      },
    });

    mockStreamObject.mockReturnValue({
      toTextStreamResponse: vi.fn(() => new Response(mockStream)),
    });

    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/chat/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Build a token board app" }],
      }),
    });

    const response = await POST(req);
    expect(response).toBeInstanceOf(Response);
    expect(response.status).not.toBe(400);
  });

  it("calls streamObject with messages and schema", async () => {
    const mockStream = new ReadableStream({ start(c) { c.close(); } });
    mockStreamObject.mockReturnValue({
      toTextStreamResponse: vi.fn(() => new Response(mockStream)),
    });

    const { POST } = await import("../route");

    const messages = [
      { role: "user", content: "Create a morning routine tracker" },
    ];

    const req = new Request("http://localhost/api/chat/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    await POST(req);

    expect(mockStreamObject).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: expect.anything(),
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user" }),
        ]),
      })
    );
  });

  it("returns 400 when messages array is empty", async () => {
    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/chat/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when messages field is missing", async () => {
    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/chat/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("uses the code gen system prompt", async () => {
    const mockStream = new ReadableStream({ start(c) { c.close(); } });
    mockStreamObject.mockReturnValue({
      toTextStreamResponse: vi.fn(() => new Response(mockStream)),
    });

    const { getCodeGenSystemPrompt } = await import("@/features/builder-v2/lib/prompt");
    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/chat/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Token board for 5-year-old" }],
      }),
    });

    await POST(req);
    expect(getCodeGenSystemPrompt).toHaveBeenCalled();
  });

  it("passes context from request to code gen prompt when provided", async () => {
    const mockStream = new ReadableStream({ start(c) { c.close(); } });
    mockStreamObject.mockReturnValue({
      toTextStreamResponse: vi.fn(() => new Response(mockStream)),
    });

    const { getCodeGenSystemPrompt } = await import("@/features/builder-v2/lib/prompt");
    const { POST } = await import("../route");

    const context = "A morning routine app for a child with ASD";
    const req = new Request("http://localhost/api/chat/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Build it" }],
        context,
      }),
    });

    await POST(req);
    expect(getCodeGenSystemPrompt).toHaveBeenCalledWith(context);
  });
});
