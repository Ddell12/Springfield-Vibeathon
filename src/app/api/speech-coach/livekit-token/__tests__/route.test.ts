import { describe, expect, it, vi } from "vitest";

// Mock authenticate so tests don't need a Convex deployment URL
vi.mock("@/app/api/lib/authenticate", () => ({
  authenticate: vi.fn().mockResolvedValue({ userId: "test-user-123", convex: {} }),
}));

// Mock livekit-server-sdk before importing the route handler
vi.mock("livekit-server-sdk", () => {
  return {
    AccessToken: vi.fn().mockImplementation(() => ({
      addGrant: vi.fn(),
      toJwt: vi.fn().mockResolvedValue("mock-jwt-token"),
    })),
  };
});

describe("speech-coach livekit-token route", () => {
  it("returns 400 when roomName is missing", async () => {
    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/speech-coach/livekit-token", {
      method: "POST",
      body: JSON.stringify({ participantName: "user-123" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/roomName/);
  });

  it("returns 400 when participantName is missing", async () => {
    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/speech-coach/livekit-token", {
      method: "POST",
      body: JSON.stringify({ roomName: "speech-coach-abc123" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/participantName/);
  });

  it("returns 400 when both roomName and participantName are missing", async () => {
    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/speech-coach/livekit-token", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
