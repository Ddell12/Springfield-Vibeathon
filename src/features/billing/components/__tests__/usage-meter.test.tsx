import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { describe, expect, it, vi } from "vitest";

const mockUseEntitlements = vi.fn();
vi.mock("@/core/hooks/use-entitlements", () => ({
  useEntitlements: () => mockUseEntitlements(),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("../../../../../convex/_generated/api", () => ({
  api: {
    usage: { getUsage: "mock" },
  },
}));

vi.mock("@/core/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => (
    <h3 className={className}>{children}</h3>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("@/shared/components/ui/progress", () => ({
  Progress: ({ value, className }: any) => (
    <div data-testid="progress" data-value={value} className={className} />
  ),
}));

import { UsageMeter } from "../usage-meter";

describe("UsageMeter", () => {
  it("shows loading state when data is not ready", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    mockUseEntitlements.mockReturnValue({
      limits: { maxApps: 5, maxDecks: 3 },
      isPremium: false,
      isLoading: true,
    });
    const { container } = render(<UsageMeter />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows app and generation counts for free users", () => {
    vi.mocked(useQuery).mockReturnValue({
      appCount: 2,
      generationCount: 8,
      periodStart: Date.now(),
    });
    mockUseEntitlements.mockReturnValue({
      limits: { maxApps: 5, maxDecks: 3 },
      isPremium: false,
      isLoading: false,
    });
    render(<UsageMeter />);
    expect(screen.getByText("2 / 5")).toBeInTheDocument();
    expect(screen.getByText("8 / 20")).toBeInTheDocument();
  });

  it("shows unlimited for premium users", () => {
    vi.mocked(useQuery).mockReturnValue({
      appCount: 10,
      generationCount: 50,
      periodStart: Date.now(),
    });
    mockUseEntitlements.mockReturnValue({
      limits: { maxApps: Infinity, maxDecks: Infinity },
      isPremium: true,
      isLoading: false,
    });
    render(<UsageMeter />);
    expect(screen.getByText("10 (unlimited)")).toBeInTheDocument();
    expect(screen.getByText("50 (unlimited)")).toBeInTheDocument();
  });

  it("renders usage labels", () => {
    vi.mocked(useQuery).mockReturnValue({
      appCount: 0,
      generationCount: 0,
      periodStart: Date.now(),
    });
    mockUseEntitlements.mockReturnValue({
      limits: { maxApps: 5, maxDecks: 3 },
      isPremium: false,
      isLoading: false,
    });
    render(<UsageMeter />);
    expect(screen.getByText("Apps created")).toBeInTheDocument();
    expect(screen.getByText("Generations")).toBeInTheDocument();
  });

  it("renders progress bars with correct aria labels", () => {
    vi.mocked(useQuery).mockReturnValue({
      appCount: 3,
      generationCount: 15,
      periodStart: Date.now(),
    });
    mockUseEntitlements.mockReturnValue({
      limits: { maxApps: 5, maxDecks: 3 },
      isPremium: false,
      isLoading: false,
    });
    render(<UsageMeter />);
    expect(
      screen.getByLabelText("Apps created: 3 of 5"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Generations: 15 of 20"),
    ).toBeInTheDocument();
  });

  it("shows the section title", () => {
    vi.mocked(useQuery).mockReturnValue({
      appCount: 0,
      generationCount: 0,
      periodStart: Date.now(),
    });
    mockUseEntitlements.mockReturnValue({
      limits: { maxApps: 5, maxDecks: 3 },
      isPremium: false,
      isLoading: false,
    });
    render(<UsageMeter />);
    expect(screen.getByText("Usage This Month")).toBeInTheDocument();
  });
});
