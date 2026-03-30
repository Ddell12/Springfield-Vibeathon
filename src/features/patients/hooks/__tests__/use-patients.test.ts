import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  usePatients,
  usePatient,
  usePatientStats,
  usePatientActivity,
  usePatientMaterials,
  useCaregiverLinks,
} from "../use-patients";
import type { Id } from "../../../../../convex/_generated/dataModel";

const mockUseConvexAuth = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useConvexAuth: () => mockUseConvexAuth(),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

const fakePatientId = "patient123" as Id<"patients">;

/** Helper: get the args object (second argument) passed to mockUseQuery */
function queryArgs() {
  return mockUseQuery.mock.calls[0][1];
}

describe("use-patients hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("usePatients", () => {
    it("passes empty args when authenticated without status", () => {
      mockUseConvexAuth.mockReturnValue({ isAuthenticated: true });
      mockUseQuery.mockReturnValue([]);
      renderHook(() => usePatients());
      expect(mockUseQuery).toHaveBeenCalledTimes(1);
      expect(queryArgs()).toEqual({});
    });

    it("passes status when authenticated with status", () => {
      mockUseConvexAuth.mockReturnValue({ isAuthenticated: true });
      mockUseQuery.mockReturnValue([]);
      renderHook(() => usePatients("active"));
      expect(queryArgs()).toEqual({ status: "active" });
    });

    it("passes 'skip' when not authenticated", () => {
      mockUseConvexAuth.mockReturnValue({ isAuthenticated: false });
      renderHook(() => usePatients());
      expect(queryArgs()).toBe("skip");
    });
  });

  describe("usePatient", () => {
    it("passes patientId when authenticated", () => {
      mockUseConvexAuth.mockReturnValue({ isAuthenticated: true });
      mockUseQuery.mockReturnValue(null);
      renderHook(() => usePatient(fakePatientId));
      expect(queryArgs()).toEqual({ patientId: fakePatientId });
    });

    it("passes 'skip' when not authenticated", () => {
      mockUseConvexAuth.mockReturnValue({ isAuthenticated: false });
      renderHook(() => usePatient(fakePatientId));
      expect(queryArgs()).toBe("skip");
    });
  });

  describe("usePatientStats", () => {
    it("passes empty args when authenticated", () => {
      mockUseConvexAuth.mockReturnValue({ isAuthenticated: true });
      mockUseQuery.mockReturnValue(null);
      renderHook(() => usePatientStats());
      expect(queryArgs()).toEqual({});
    });

    it("passes 'skip' when not authenticated", () => {
      mockUseConvexAuth.mockReturnValue({ isAuthenticated: false });
      renderHook(() => usePatientStats());
      expect(queryArgs()).toBe("skip");
    });
  });

  describe("usePatientActivity", () => {
    it("passes patientId when authenticated without limit", () => {
      mockUseConvexAuth.mockReturnValue({ isAuthenticated: true });
      mockUseQuery.mockReturnValue([]);
      renderHook(() => usePatientActivity(fakePatientId));
      const args = queryArgs();
      expect(args).toHaveProperty("patientId", fakePatientId);
    });

    it("passes patientId and limit when authenticated with limit", () => {
      mockUseConvexAuth.mockReturnValue({ isAuthenticated: true });
      mockUseQuery.mockReturnValue([]);
      renderHook(() => usePatientActivity(fakePatientId, 20));
      const args = queryArgs();
      expect(args).toEqual({ patientId: fakePatientId, limit: 20 });
    });

    it("passes 'skip' when not authenticated", () => {
      mockUseConvexAuth.mockReturnValue({ isAuthenticated: false });
      renderHook(() => usePatientActivity(fakePatientId));
      expect(queryArgs()).toBe("skip");
    });
  });

  describe("usePatientMaterials", () => {
    it("passes patientId when authenticated", () => {
      mockUseConvexAuth.mockReturnValue({ isAuthenticated: true });
      mockUseQuery.mockReturnValue([]);
      renderHook(() => usePatientMaterials(fakePatientId));
      expect(queryArgs()).toEqual({ patientId: fakePatientId });
    });

    it("passes 'skip' when not authenticated", () => {
      mockUseConvexAuth.mockReturnValue({ isAuthenticated: false });
      renderHook(() => usePatientMaterials(fakePatientId));
      expect(queryArgs()).toBe("skip");
    });
  });

  describe("useCaregiverLinks", () => {
    it("passes patientId when authenticated", () => {
      mockUseConvexAuth.mockReturnValue({ isAuthenticated: true });
      mockUseQuery.mockReturnValue([]);
      renderHook(() => useCaregiverLinks(fakePatientId));
      expect(queryArgs()).toEqual({ patientId: fakePatientId });
    });

    it("passes 'skip' when not authenticated", () => {
      mockUseConvexAuth.mockReturnValue({ isAuthenticated: false });
      renderHook(() => useCaregiverLinks(fakePatientId));
      expect(queryArgs()).toBe("skip");
    });
  });
});
