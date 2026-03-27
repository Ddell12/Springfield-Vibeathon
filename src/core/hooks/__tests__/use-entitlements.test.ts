import { describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: mockUseQuery,
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    entitlements: {
      getEntitlements: "entitlements:getEntitlements",
    },
  },
}));

import { FREE_PLAN, useEntitlements } from "../use-entitlements";

describe("useEntitlements", () => {
  it("returns free plan defaults when query is loading", () => {
    mockUseQuery.mockReturnValue(undefined);
    const result = useEntitlements();
    expect(result.plan).toBe("free");
    expect(result.limits.maxApps).toBe(5);
    expect(result.limits.maxDecks).toBe(3);
    expect(result.isLoading).toBe(true);
    expect(result.isPremium).toBe(false);
  });

  it("returns free plan when query returns free", () => {
    mockUseQuery.mockReturnValue(FREE_PLAN);
    const result = useEntitlements();
    expect(result.plan).toBe("free");
    expect(result.isPremium).toBe(false);
    expect(result.isLoading).toBe(false);
  });

  it("returns premium when query returns premium", () => {
    mockUseQuery.mockReturnValue({
      plan: "premium",
      limits: { maxApps: Infinity, maxDecks: Infinity },
    });
    const result = useEntitlements();
    expect(result.plan).toBe("premium");
    expect(result.isPremium).toBe(true);
    expect(result.isLoading).toBe(false);
  });
});
