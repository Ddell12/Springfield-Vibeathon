import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCurrentUser = vi.fn();
const mockRedirect = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: () => mockCurrentUser(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

beforeEach(() => {
  mockRedirect.mockClear();
  mockCurrentUser.mockReset();
});

describe("requireSlpUser", () => {
  it("redirects caregivers to /family", async () => {
    mockCurrentUser.mockResolvedValue({
      publicMetadata: { role: "caregiver" },
    });

    const { requireSlpUser } = await import("../server-role-guards");
    await requireSlpUser();

    expect(mockRedirect).toHaveBeenCalledWith("/family");
  });

  it("allows therapist users through", async () => {
    mockCurrentUser.mockResolvedValue({
      publicMetadata: { role: "slp" },
    });

    const { requireSlpUser } = await import("../server-role-guards");
    const user = await requireSlpUser();

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(user).toBeDefined();
  });
});
