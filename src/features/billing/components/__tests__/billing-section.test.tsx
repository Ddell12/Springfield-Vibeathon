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
  },
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
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
});
