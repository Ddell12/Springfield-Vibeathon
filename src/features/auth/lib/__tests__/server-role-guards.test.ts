import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchQuery = vi.fn();
const mockToken = vi.fn();
const mockRedirect = vi.fn();

vi.mock("@convex-dev/auth/nextjs/server", () => ({
  convexAuthNextjsToken: () => mockToken(),
}));

vi.mock("convex/nextjs", () => ({
  fetchQuery: (...args: unknown[]) => mockFetchQuery(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT: ${url}`);
  },
}));

beforeEach(() => {
  mockRedirect.mockClear();
  mockFetchQuery.mockReset();
  mockToken.mockReset();
});

describe("requireSlpUser", () => {
  it("redirects caregivers to /family", async () => {
    mockToken.mockResolvedValue("fake-token");
    mockFetchQuery.mockResolvedValue({ _id: "user_1", role: "caregiver" });

    const { requireSlpUser } = await import("../server-role-guards");
    await expect(requireSlpUser()).rejects.toThrow("NEXT_REDIRECT: /family");

    expect(mockRedirect).toHaveBeenCalledWith("/family");
  });

  it("redirects unauthenticated users to /sign-in", async () => {
    mockToken.mockResolvedValue(null);
    mockRedirect.mockClear();

    const { requireSlpUser } = await import("../server-role-guards");
    await expect(requireSlpUser()).rejects.toThrow("NEXT_REDIRECT: /sign-in");

    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });

  it("allows therapist users through", async () => {
    mockToken.mockResolvedValue("fake-token");
    mockFetchQuery.mockResolvedValue({ _id: "user_1", role: "slp" });

    const { requireSlpUser } = await import("../server-role-guards");
    const user = await requireSlpUser();

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(user).toBeDefined();
  });
});
