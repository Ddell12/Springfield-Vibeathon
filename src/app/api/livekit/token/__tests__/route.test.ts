import { beforeEach,describe, expect, it, vi } from "vitest";

// Mock the authenticate helper (used by the route instead of calling Clerk directly)
const mockQuery = vi.fn();
const mockAuthenticate = vi.fn();
vi.mock("@/app/api/lib/authenticate", () => ({
  authenticate: () => mockAuthenticate(),
}));

// Mock livekit-server-sdk — must use a class so `new AccessToken(...)` works
vi.mock("livekit-server-sdk", () => {
  class AccessToken {
    addGrant = vi.fn();
    toJwt = vi.fn().mockResolvedValue("mock-jwt-token");
  }
  return { AccessToken };
});

// Set env vars before importing route
process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
process.env.LIVEKIT_API_KEY = "test-key";
process.env.LIVEKIT_API_SECRET = "test-secret";
process.env.NEXT_PUBLIC_LIVEKIT_URL = "wss://test.livekit.cloud";

const { POST } = await import("../route");

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/livekit/token", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/livekit/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockAuthenticate.mockResolvedValue({
      convex: { setAuth: vi.fn(), query: mockQuery },
      userId: null,
    });

    const res = await POST(makeRequest({ appointmentId: "appt-1" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Not authenticated");
  });

  it("returns 403 when appointment status is cancelled", async () => {
    mockAuthenticate.mockResolvedValue({
      userId: "slp-user-123",
      convex: { setAuth: vi.fn(), query: mockQuery },
    });
    mockQuery.mockResolvedValue({
      _id: "appt-1",
      slpId: "slp-user-123",
      patientId: "patient-1",
      status: "cancelled",
    });

    const res = await POST(makeRequest({ appointmentId: "appt-1" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("not joinable");
  });

  it("returns 403 when appointment status is completed", async () => {
    mockAuthenticate.mockResolvedValue({
      userId: "slp-user-123",
      convex: { setAuth: vi.fn(), query: mockQuery },
    });
    mockQuery.mockResolvedValue({
      _id: "appt-1",
      slpId: "slp-user-123",
      patientId: "patient-1",
      status: "completed",
    });

    const res = await POST(makeRequest({ appointmentId: "appt-1" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("not joinable");
  });

  it("returns 403 when user has no relationship to appointment", async () => {
    mockAuthenticate.mockResolvedValue({
      userId: "random-user-999",
      convex: { setAuth: vi.fn(), query: mockQuery },
    });
    // appointments.get throws for unauthorized users; route catch block maps to 403
    mockQuery.mockRejectedValueOnce(new Error("Not authorized"));

    const res = await POST(makeRequest({ appointmentId: "appt-1" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("Not authorized");
  });

  it("returns token when user is the SLP", async () => {
    mockAuthenticate.mockResolvedValue({
      userId: "slp-user-123",
      convex: { setAuth: vi.fn(), query: mockQuery },
    });
    mockQuery.mockResolvedValue({
      _id: "appt-1",
      slpId: "slp-user-123",
      patientId: "patient-1",
      status: "scheduled",
    });

    const res = await POST(makeRequest({ appointmentId: "appt-1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toBe("mock-jwt-token");
  });

  it("returns token when user is accepted caregiver", async () => {
    mockAuthenticate.mockResolvedValue({
      userId: "caregiver-789",
      convex: { setAuth: vi.fn(), query: mockQuery },
    });
    mockQuery
      .mockResolvedValueOnce({
        _id: "appt-1",
        slpId: "slp-user-123",
        patientId: "patient-1",
        status: "in-progress",
      })
      .mockResolvedValueOnce({
        _id: "link-1",
        caregiverUserId: "caregiver-789",
        patientId: "patient-1",
        inviteStatus: "accepted",
      });

    const res = await POST(makeRequest({ appointmentId: "appt-1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toBe("mock-jwt-token");
  });
});
