import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock authenticate so tests don't need a Convex deployment URL
vi.mock("@/app/api/lib/authenticate", () => ({
  authenticate: vi.fn().mockResolvedValue({ userId: "test-user-123", convex: {} }),
}));

// Mock livekit-server-sdk before importing the route handler
vi.mock("livekit-server-sdk", () => {
  return {
    RoomServiceClient: vi.fn().mockImplementation(function MockRoomServiceClient() {
      return {
      createRoom: vi.fn().mockResolvedValue(undefined),
      updateRoomMetadata: vi.fn().mockResolvedValue(undefined),
      };
    }),
    AccessToken: vi.fn().mockImplementation(function MockAccessToken() {
      return {
        addGrant: vi.fn(),
        toJwt: vi.fn().mockResolvedValue("mock-jwt-token"),
      };
    }),
  };
});

describe("speech-coach livekit-token route", () => {
  beforeEach(() => {
    vi.stubEnv("LIVEKIT_API_KEY", "test-api-key");
    vi.stubEnv("LIVEKIT_API_SECRET", "test-api-secret");
    vi.stubEnv("NEXT_PUBLIC_LIVEKIT_URL", "wss://livekit.example.com");
  });

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

  it("returns 401 when authentication fails", async () => {
    const { authenticate } = await import("@/app/api/lib/authenticate");
    vi.mocked(authenticate).mockResolvedValueOnce({ userId: undefined, convex: {} as never });

    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/speech-coach/livekit-token", {
      method: "POST",
      body: JSON.stringify({
        roomName: "speech-coach-abc123",
        participantName: "participant",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns a token for an authenticated caller", async () => {
    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/speech-coach/livekit-token", {
      method: "POST",
      body: JSON.stringify({
        roomName: "speech-coach-abc123",
        participantName: "participant name",
        roomMetadata: "{\"sessionId\":\"abc123\"}",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      token: "mock-jwt-token",
      serverUrl: "wss://livekit.example.com",
    });
  });
});
