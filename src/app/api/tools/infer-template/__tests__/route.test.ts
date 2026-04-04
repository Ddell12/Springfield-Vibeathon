import { beforeEach, describe, expect, it, vi } from "vitest";

const mockConvexAuthNextjsToken = vi.fn().mockResolvedValue("test-token");

vi.mock("@convex-dev/auth/nextjs/server", () => ({
  convexAuthNextjsToken: mockConvexAuthNextjsToken,
}));

// First generateText call returns { templateType, suggestedTitle }
// Second generateText call returns config object
let callCount = 0;
vi.mock("ai", () => ({
  generateText: vi.fn().mockImplementation(() => {
    callCount++;
    if (callCount % 2 === 1) {
      // Odd call = inference
      return Promise.resolve({
        output: { templateType: "token_board", suggestedTitle: "Marcus Token Board" },
      });
    }
    // Even call = config generation
    return Promise.resolve({
      output: {
        title: "Marcus Token Board",
        tokenCount: 5,
        rewardLabel: "iPad time",
        tokenShape: "star",
        tokenColor: "#FBBF24",
        highContrast: false,
      },
    });
  }),
  Output: {
    object: vi.fn(({ schema }) => ({ schema })),
  },
}));

import { POST } from "../route";

describe("POST /api/tools/infer-template", () => {
  beforeEach(() => {
    callCount = 0;
    mockConvexAuthNextjsToken.mockResolvedValue("test-token");
  });

  it("returns 401 when unauthenticated", async () => {
    mockConvexAuthNextjsToken.mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/tools/infer-template", {
      method: "POST",
      body: JSON.stringify({ description: "token board for Marcus" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for empty description", async () => {
    const req = new Request("http://localhost/api/tools/infer-template", {
      method: "POST",
      body: JSON.stringify({ description: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns templateType, configJson, suggestedTitle for valid description", async () => {
    const req = new Request("http://localhost/api/tools/infer-template", {
      method: "POST",
      body: JSON.stringify({
        description: "token board for Marcus, 5 tokens, reward is iPad time",
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.templateType).toBe("token_board");
    expect(body.suggestedTitle).toBe("Marcus Token Board");
    expect(typeof body.configJson).toBe("string");
    const config = JSON.parse(body.configJson);
    expect(config.tokenCount).toBe(5);
  });
});
