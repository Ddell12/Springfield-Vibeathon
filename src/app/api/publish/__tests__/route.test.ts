import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FragmentResult } from "@/features/builder-v2/lib/schema";

// Mock Vercel deploy helper
const mockDeployToVercel = vi.fn();
vi.mock("@/features/builder-v2/lib/vercel", () => ({
  deployToVercel: mockDeployToVercel,
}));

const validFragment: FragmentResult = {
  title: "Morning Routine App",
  description: "An interactive morning routine for children",
  template: "vite-therapy",
  code: "export default function App() { return <div>Hello</div>; }",
  file_path: "src/App.tsx",
  has_additional_dependencies: false,
  port: 5173,
};

describe("POST /api/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore VERCEL_TOKEN env var — most tests want it present
    vi.stubEnv("VERCEL_TOKEN", "test-vercel-token");
  });

  it("returns 400 when fragment is missing from request body", async () => {
    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when fragment is invalid (wrong template)", async () => {
    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fragment: { ...validFragment, template: "invalid-template" },
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 500 when VERCEL_TOKEN is not configured", async () => {
    vi.stubEnv("VERCEL_TOKEN", "");

    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragment: validFragment }),
    });

    const response = await POST(req);
    expect(response.status).toBe(500);
  });

  it("returns the Vercel URL on success", async () => {
    mockDeployToVercel.mockResolvedValue({
      url: "https://bridges-morning-routine.vercel.app",
    });

    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragment: validFragment, projectTitle: "Morning Routine" }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("url");
    expect(body.url).toContain("vercel.app");
  });

  it("returns 502 when Vercel deploy fails", async () => {
    mockDeployToVercel.mockRejectedValue(new Error("Vercel API error: 503"));

    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragment: validFragment }),
    });

    const response = await POST(req);
    expect(response.status).toBe(502);
  });

  it("calls deployToVercel with the fragment code", async () => {
    mockDeployToVercel.mockResolvedValue({
      url: "https://bridges-test.vercel.app",
    });

    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragment: validFragment }),
    });

    await POST(req);

    expect(mockDeployToVercel).toHaveBeenCalledWith(
      expect.objectContaining({
        code: validFragment.code,
      })
    );
  });
});
