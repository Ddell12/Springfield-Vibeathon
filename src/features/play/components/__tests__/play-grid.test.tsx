import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";

// Mocks must be declared before any imports that use them
vi.mock("convex/react", () => ({
  useConvexAuth: vi.fn(),
  useQuery: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    patients: { getForPlay: "patients.getForPlay" },
    patientMaterials: { listByPatient: "patientMaterials.listByPatient" },
    homePrograms: { listByPatient: "homePrograms.listByPatient" },
  },
}));
vi.mock("../../hooks/use-play-data", () => ({
  usePlayData: vi.fn(),
}));
vi.mock("../play-auth-guard", () => ({
  PlayAuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../app-tile", () => ({
  AppTile: ({ title }: { title: string }) => <div data-testid="app-tile">{title}</div>,
}));

import { useQuery } from "convex/react";
import { usePlayData } from "../../hooks/use-play-data";

describe("PlayGrid", () => {
  const patientId = "patient-123";
  const paramsPromise = Promise.resolve({ patientId });

  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue({ firstName: "Ace" });
  });

  it("shows empty state when there are no apps", async () => {
    vi.mocked(usePlayData).mockReturnValue({ apps: [], isLoading: false });

    const { PlayGrid } = await import("../play-grid");
    await act(async () => {
      render(<PlayGrid paramsPromise={paramsPromise} />);
      await paramsPromise;
    });

    expect(await screen.findByText("No activities yet")).toBeInTheDocument();
  });

  it("shows loading spinner when data is loading", async () => {
    vi.mocked(usePlayData).mockReturnValue({ apps: undefined, isLoading: true });

    const { PlayGrid } = await import("../play-grid");

    const { container } = render(<PlayGrid paramsPromise={paramsPromise} />);
    // spinner should be present (animate-spin class)
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders app tiles when apps are available", async () => {
    vi.mocked(usePlayData).mockReturnValue({
      apps: [
        {
          materialId: "mat1" as never,
          appId: "app1" as never,
          title: "AAC Board",
          description: "",
          assignedAt: 1000,
          hasPracticeProgram: false,
        },
        {
          materialId: "mat2" as never,
          appId: "app2" as never,
          title: "Sound Safari",
          description: "",
          assignedAt: 2000,
          hasPracticeProgram: true,
        },
      ],
      isLoading: false,
    });

    const { PlayGrid } = await import("../play-grid");
    render(<PlayGrid paramsPromise={paramsPromise} />);

    expect(await screen.findByText("AAC Board")).toBeInTheDocument();
    expect(screen.getByText("Sound Safari")).toBeInTheDocument();
    expect(screen.getAllByTestId("app-tile")).toHaveLength(2);
  });

  it("renders child first name in header", async () => {
    vi.mocked(usePlayData).mockReturnValue({ apps: [], isLoading: false });
    vi.mocked(useQuery).mockReturnValue({ firstName: "Ace" });

    const { PlayGrid } = await import("../play-grid");
    render(<PlayGrid paramsPromise={paramsPromise} />);

    expect(await screen.findByText("Ace's Activities")).toBeInTheDocument();
  });

  it("settings link points to family patient page", async () => {
    vi.mocked(usePlayData).mockReturnValue({ apps: [], isLoading: false });

    const { PlayGrid } = await import("../play-grid");
    render(<PlayGrid paramsPromise={paramsPromise} />);

    const settingsLink = await screen.findByRole("link", { name: "Settings" });
    expect(settingsLink).toHaveAttribute("href", `/family/${patientId}`);
  });
});
