import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { api } from "../../../../../convex/_generated/api";
import { useAcceptInvite,useInviteInfo } from "../use-invite";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

describe("use-invite hooks", () => {
  describe("useInviteInfo", () => {
    it("passes correct API reference and token", () => {
      mockUseQuery.mockReturnValue(null);
      renderHook(() => useInviteInfo("test-token-abc"));
      expect(mockUseQuery).toHaveBeenCalledWith(api.caregivers.getInvite, {
        token: "test-token-abc",
      });
    });
  });

  describe("useAcceptInvite", () => {
    it("passes correct API reference", () => {
      const fakeMutationFn = vi.fn();
      mockUseMutation.mockReturnValue(fakeMutationFn);
      const { result } = renderHook(() => useAcceptInvite());
      expect(mockUseMutation).toHaveBeenCalledWith(api.caregivers.acceptInvite);
      expect(result.current).toBe(fakeMutationFn);
    });
  });
});
