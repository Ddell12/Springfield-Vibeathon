import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FragmentResult } from "@/features/builder-v2/lib/schema";

// Mock the e2b helpers
const mockCreateSandbox = vi.fn();
vi.mock("@/features/builder-v2/lib/e2b", () => ({
  createSandbox: mockCreateSandbox,
}));

const validFragment: FragmentResult = {
  title: "Morning Routine App",
  description: "An interactive morning routine for children",
  template: "nextjs-developer",
  code: "export default function App() { return <div>Hello</div>; }",
  file_path: "app/page.tsx",
  has_additional_dependencies: false,
  port: 3000,
};

describe("POST /api/sandbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when fragment is missing from request body", async () => {
    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when request body is empty", async () => {
    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(null),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when fragment has invalid template", async () => {
    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fragment: { ...validFragment, template: "invalid-template" },
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("calls createSandbox with the fragment and returns sandboxId + url", async () => {
    mockCreateSandbox.mockResolvedValue({
      sandboxId: "sandbox-xyz-789",
      url: "https://sandbox-xyz-789-3000.e2b.app",
    });

    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragment: validFragment }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("sandboxId", "sandbox-xyz-789");
    expect(body).toHaveProperty("url", "https://sandbox-xyz-789-3000.e2b.app");
  });

  it("passes the correct fragment to createSandbox", async () => {
    mockCreateSandbox.mockResolvedValue({
      sandboxId: "sandbox-abc",
      url: "https://sandbox-abc-3000.e2b.app",
    });

    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragment: validFragment }),
    });

    await POST(req);

    expect(mockCreateSandbox).toHaveBeenCalledWith(
      expect.objectContaining({
        title: validFragment.title,
        template: validFragment.template,
        code: validFragment.code,
      })
    );
  });

  it("returns 500 when createSandbox throws", async () => {
    mockCreateSandbox.mockRejectedValue(new Error("E2B quota exceeded"));

    const { POST } = await import("../route");

    const req = new Request("http://localhost/api/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragment: validFragment }),
    });

    const response = await POST(req);
    expect(response.status).toBe(500);
  });
});
