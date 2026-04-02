import { act, render, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks must come before component import
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useConvexAuth: vi.fn(() => ({ isAuthenticated: true })),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock the sub-components that will be extracted (they don't exist yet)
vi.mock("../family-kid-mode-entry", () => ({
  FamilyKidModeEntry: ({
    hasPIN,
    onEnter,
  }: {
    hasPIN: boolean | undefined;
    onEnter: () => void;
    onManageApps: () => void;
  }) => (
    <button
      onClick={onEnter}
      disabled={hasPIN === undefined}
      aria-label="kid mode"
    >
      Kid Mode
    </button>
  ),
}));

vi.mock("../family-intake-banner", () => ({
  FamilyIntakeBanner: ({
    requiredFormProgress,
  }: {
    requiredFormProgress: { signed: number; total: number; isComplete: boolean };
  }) =>
    requiredFormProgress && !requiredFormProgress.isComplete ? (
      <div>
        {requiredFormProgress.signed} of {requiredFormProgress.total} required
        forms signed
      </div>
    ) : null,
}));

// Mock hooks that family-dashboard depends on
vi.mock("../hooks/use-family-data", () => ({
  useFamilyData: vi.fn(() => ({
    streakData: null,
    unreadCount: 0,
    isLoading: false,
  })),
}));
vi.mock("@/features/family/hooks/use-family-data", () => ({
  useFamilyData: vi.fn(() => ({
    streakData: null,
    unreadCount: 0,
    isLoading: false,
  })),
}));

vi.mock("@/features/intake/hooks/use-intake-forms", () => ({
  useIntakeForms: vi.fn(() => ({
    requiredFormProgress: { signed: 4, total: 4, isComplete: true },
  })),
}));

// Mock child components to keep tests focused on orchestrator behavior
vi.mock("../published-tools-section", () => ({
  PublishedToolsSection: () => null,
}));
vi.mock("../today-activities", () => ({
  TodayActivities: () => null,
}));
vi.mock("../streak-tracker", () => ({
  StreakTracker: () => null,
}));
vi.mock("../celebration-card", () => ({
  CelebrationCard: () => null,
}));
vi.mock("../weekly-progress", () => ({
  WeeklyProgress: () => null,
}));
vi.mock("../family-speech-coach-cards", () => ({
  FamilySpeechCoachCards: () => null,
}));
vi.mock("../pin-setup-modal", () => ({
  PinSetupModal: () => null,
}));
vi.mock("../app-picker", () => ({
  AppPicker: () => null,
}));

import { useConvexAuth, useQuery } from "convex/react";

import { FamilyDashboard } from "../family-dashboard";

const PATIENT_ID = "p1";

function makeParamsPromise(patientId = PATIENT_ID) {
  return Promise.resolve({ patientId });
}

describe("FamilyDashboard", () => {
  beforeEach(() => {
    vi.mocked(useConvexAuth).mockReturnValue({ isAuthenticated: true, isLoading: false });
  });

  it("disables Kid Mode entry until PIN state resolves", async () => {
    // All queries return undefined (loading)
    vi.mocked(useQuery).mockReturnValue(undefined);

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <FamilyDashboard paramsPromise={makeParamsPromise()} />
        </Suspense>
      );
    });

    // Wait for React.use() to resolve the promise and re-render
    const btn = await screen.findByRole("button", { name: /kid mode/i });
    expect(btn).toBeDisabled();
  });

  it("shows the intake banner when required forms are incomplete", async () => {
    const { useIntakeForms } = await import(
      "@/features/intake/hooks/use-intake-forms"
    );
    vi.mocked(useIntakeForms).mockReturnValue({
      requiredFormProgress: { signed: 1, total: 4, isComplete: false },
    } as any);

    // Patient query returns a value so we don't stay in loading skeleton
    vi.mocked(useQuery).mockImplementation((query: any, args: any) => {
      if (args === "skip") return undefined;
      // Return a minimal patient object for the patient query
      return { firstName: "Alex" } as any;
    });

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <FamilyDashboard paramsPromise={makeParamsPromise()} />
        </Suspense>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/1 of 4 required forms signed/i)).toBeInTheDocument();
    });
  });
});
