import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockUseEntitlements = vi.fn();
vi.mock("@/core/hooks/use-entitlements", () => ({
  useEntitlements: () => mockUseEntitlements(),
}));

vi.mock("@/core/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/badge", () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

vi.mock("@/shared/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => (
    <h3 className={className}>{children}</h3>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

import { PlanComparisonCard } from "../plan-comparison-card";

describe("PlanComparisonCard", () => {
  it("renders Free and Premium plan cards", () => {
    mockUseEntitlements.mockReturnValue({
      plan: "free",
      isPremium: false,
      isLoading: false,
    });
    render(<PlanComparisonCard />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
  });

  it("highlights Free as current plan for free users", () => {
    mockUseEntitlements.mockReturnValue({
      plan: "free",
      isPremium: false,
      isLoading: false,
    });
    render(<PlanComparisonCard />);
    expect(screen.getByText("Current Plan")).toBeInTheDocument();
    // The "Current Plan" badge should be next to "Free"
    const freePlan = screen.getByText("Free");
    expect(freePlan.closest("div")).toContainElement(
      screen.getByText("Current Plan"),
    );
  });

  it("highlights Premium as current plan for premium users", () => {
    mockUseEntitlements.mockReturnValue({
      plan: "premium",
      isPremium: true,
      isLoading: false,
    });
    render(<PlanComparisonCard />);
    expect(screen.getByText("Current Plan")).toBeInTheDocument();
    const premiumPlan = screen.getByText("Premium");
    expect(premiumPlan.closest("div")).toContainElement(
      screen.getByText("Current Plan"),
    );
  });

  it("shows loading skeleton when loading", () => {
    mockUseEntitlements.mockReturnValue({
      plan: "free",
      isPremium: false,
      isLoading: true,
    });
    const { container } = render(<PlanComparisonCard />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
  });

  it("shows pricing for both plans", () => {
    mockUseEntitlements.mockReturnValue({
      plan: "free",
      isPremium: false,
      isLoading: false,
    });
    render(<PlanComparisonCard />);
    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getByText("$9.99")).toBeInTheDocument();
  });

  it("lists feature items for free plan", () => {
    mockUseEntitlements.mockReturnValue({
      plan: "free",
      isPremium: false,
      isLoading: false,
    });
    render(<PlanComparisonCard />);
    expect(screen.getByText("Up to 5 apps")).toBeInTheDocument();
    expect(screen.getByText("20 generations per month")).toBeInTheDocument();
  });

  it("lists feature items for premium plan", () => {
    mockUseEntitlements.mockReturnValue({
      plan: "free",
      isPremium: false,
      isLoading: false,
    });
    render(<PlanComparisonCard />);
    expect(screen.getByText("Unlimited apps")).toBeInTheDocument();
    expect(screen.getByText("Unlimited generations")).toBeInTheDocument();
    expect(screen.getByText("Priority support")).toBeInTheDocument();
  });
});
