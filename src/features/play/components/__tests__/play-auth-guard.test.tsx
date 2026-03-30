import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock the convex and next modules
vi.mock("convex/react", () => ({
  useConvexAuth: vi.fn(),
  useQuery: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("../../../../../convex/_generated/api", () => ({
  api: { patients: { getForPlay: "patients.getForPlay" } },
}));

import { useConvexAuth, useQuery } from "convex/react";

import { PlayAuthGuard } from "../play-auth-guard";

describe("PlayAuthGuard", () => {
  it("shows loading spinner while auth is loading", () => {
    vi.mocked(useConvexAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(
      <PlayAuthGuard patientId="test-id">
        <div>Children</div>
      </PlayAuthGuard>
    );

    expect(screen.queryByText("Children")).not.toBeInTheDocument();
  });

  it("shows no-access message when patient is null", () => {
    vi.mocked(useConvexAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    vi.mocked(useQuery).mockReturnValue(null);

    render(
      <PlayAuthGuard patientId="test-id">
        <div>Children</div>
      </PlayAuthGuard>
    );

    expect(screen.getByText("No access")).toBeInTheDocument();
    expect(screen.getByText(/Ask your therapist/)).toBeInTheDocument();
  });

  it("renders children when patient data is available", () => {
    vi.mocked(useConvexAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    vi.mocked(useQuery).mockReturnValue({ firstName: "Ace" });

    render(
      <PlayAuthGuard patientId="test-id">
        <div>Children</div>
      </PlayAuthGuard>
    );

    expect(screen.getByText("Children")).toBeInTheDocument();
  });
});
