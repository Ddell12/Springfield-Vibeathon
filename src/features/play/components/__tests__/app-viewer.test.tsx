import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";

const mockReplace = vi.fn();

vi.mock("convex/react", () => ({
  useConvexAuth: vi.fn(),
  useQuery: vi.fn(),
  useAction: vi.fn(() => vi.fn()),
}));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
}));
vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    patients: { getForPlay: "patients.getForPlay" },
    generated_files: { getBundleByAppId: "generated_files.getBundleByAppId" },
    aiActions: { generateSpeech: "aiActions.generateSpeech" },
  },
}));
vi.mock("../../builder/hooks/use-tts-bridge", () => ({
  useTtsBridge: vi.fn(),
}));
vi.mock("../play-auth-guard", () => ({
  PlayAuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

// Stub URL.createObjectURL / revokeObjectURL
Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  value: vi.fn(() => "blob:mock-url"),
});
Object.defineProperty(URL, "revokeObjectURL", {
  writable: true,
  value: vi.fn(),
});

import { useQuery } from "convex/react";
import { toast } from "sonner";

describe("AppViewer", () => {
  const patientId = "patient-123";
  const appId = "app-456";
  const paramsPromise = Promise.resolve({ patientId, appId });

  beforeEach(() => {
    vi.clearAllMocks();
    (URL.createObjectURL as ReturnType<typeof vi.fn>).mockReturnValue("blob:mock-url");
  });

  it("shows loading spinner while bundle is loading", async () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    const { AppViewer } = await import("../app-viewer");

    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<AppViewer paramsPromise={paramsPromise} />));
      // resolve the params promise
      await paramsPromise;
    });

    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders iframe when bundle is available", async () => {
    vi.mocked(useQuery).mockReturnValue({ html: "<html><body>Hello</body></html>" });

    const { AppViewer } = await import("../app-viewer");
    await act(async () => {
      render(<AppViewer paramsPromise={paramsPromise} />);
      await paramsPromise;
    });

    await waitFor(() => {
      const iframe = screen.getByTitle("Therapy activity");
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute("src", "blob:mock-url");
    });
  });

  it("iframe has correct sandbox attributes", async () => {
    vi.mocked(useQuery).mockReturnValue({ html: "<html><body>Hello</body></html>" });

    const { AppViewer } = await import("../app-viewer");
    await act(async () => {
      render(<AppViewer paramsPromise={paramsPromise} />);
      await paramsPromise;
    });

    await waitFor(() => {
      const iframe = screen.getByTitle("Therapy activity");
      expect(iframe).toHaveAttribute("sandbox", "allow-scripts allow-same-origin");
    });
  });

  it("renders home button linking back to grid", async () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    const { AppViewer } = await import("../app-viewer");
    await act(async () => {
      render(<AppViewer paramsPromise={paramsPromise} />);
      await paramsPromise;
    });

    const homeButton = await screen.findByRole("link", { name: "Back to activities" });
    expect(homeButton).toBeInTheDocument();
    expect(homeButton).toHaveAttribute("href", `/family/${patientId}/play`);
  });

  it("shows toast error when bundle is null", async () => {
    vi.mocked(useQuery).mockReturnValue(null);

    const { AppViewer } = await import("../app-viewer");
    await act(async () => {
      render(<AppViewer paramsPromise={paramsPromise} />);
      await paramsPromise;
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("This activity could not be loaded.");
    });
  });
});
