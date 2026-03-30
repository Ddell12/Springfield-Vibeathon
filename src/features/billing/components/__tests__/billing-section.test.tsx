import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockUseEntitlements = vi.fn();
vi.mock("@/core/hooks/use-entitlements", () => ({
  useEntitlements: () => mockUseEntitlements(),
}));

vi.mock("convex/react", () => ({
  useAction: vi.fn(() => vi.fn()),
  useQuery: vi.fn(() => []),
}));

vi.mock("../../../../../convex/_generated/api", () => ({
  api: {
    subscriptions: {
      createCheckoutSession: "mock",
      createPortalSession: "mock",
    },
    apps: { list: "mock" },
    flashcard_decks: { list: "mock" },
    usage: { getUsage: "mock" },
    billingActions: { getInvoices: "mock" },
  },
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("../plan-comparison-card", () => ({
  PlanComparisonCard: () => <div data-testid="plan-comparison">PlanComparison</div>,
}));

vi.mock("../usage-meter", () => ({
  UsageMeter: () => <div data-testid="usage-meter">UsageMeter</div>,
}));

vi.mock("../billing-history", () => ({
  BillingHistory: () => <div data-testid="billing-history">BillingHistory</div>,
}));

vi.mock("../upgrade-confirmation-dialog", () => ({
  UpgradeConfirmationDialog: ({ children }: any) => <div data-testid="upgrade-dialog">{children}</div>,
}));

vi.mock("../downgrade-warning-dialog", () => ({
  DowngradeWarningDialog: ({ children }: any) => <div data-testid="downgrade-dialog">{children}</div>,
}));

import { BillingSection } from "../billing-section";

describe("BillingSection", () => {
  it("shows Free plan for free users", () => {
    mockUseEntitlements.mockReturnValue({
      plan: "free",
      limits: { maxApps: 5, maxDecks: 3 },
      isPremium: false,
      isLoading: false,
    });
    render(<BillingSection />);
    expect(screen.getByText(/free/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /upgrade/i }),
    ).toBeInTheDocument();
  });

  it("shows Premium plan for premium users", () => {
    mockUseEntitlements.mockReturnValue({
      plan: "premium",
      limits: { maxApps: Infinity, maxDecks: Infinity },
      isPremium: true,
      isLoading: false,
    });
    render(<BillingSection />);
    expect(screen.getByText(/premium/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /manage/i }),
    ).toBeInTheDocument();
  });

  it("shows loading skeleton when loading", () => {
    mockUseEntitlements.mockReturnValue({
      plan: "free",
      limits: { maxApps: 5, maxDecks: 3 },
      isPremium: false,
      isLoading: true,
    });
    render(<BillingSection />);
    expect(screen.getByText("Billing")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /upgrade/i }),
    ).not.toBeInTheDocument();
  });

  it("renders plan comparison, usage meter, and billing history", () => {
    mockUseEntitlements.mockReturnValue({
      plan: "free",
      limits: { maxApps: 5, maxDecks: 3 },
      isPremium: false,
      isLoading: false,
    });
    render(<BillingSection />);
    expect(screen.getByTestId("plan-comparison")).toBeInTheDocument();
    expect(screen.getByTestId("usage-meter")).toBeInTheDocument();
    expect(screen.getByTestId("billing-history")).toBeInTheDocument();
  });
});
