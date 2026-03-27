import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useAction: vi.fn(() => vi.fn()),
}));

vi.mock("../../../../../convex/_generated/api", () => ({
  api: { subscriptions: { createCheckoutSession: "mock" } },
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

import { UpgradePrompt } from "../upgrade-prompt";

describe("UpgradePrompt", () => {
  it("renders the upgrade message", () => {
    render(<UpgradePrompt message="You've used all 5 free app slots." />);
    expect(screen.getByText(/5 free app slots/i)).toBeInTheDocument();
  });

  it("renders an upgrade button", () => {
    render(<UpgradePrompt message="Limit reached." />);
    expect(
      screen.getByRole("button", { name: /upgrade/i }),
    ).toBeInTheDocument();
  });

  it("shows pricing info", () => {
    render(<UpgradePrompt message="Limit reached." />);
    expect(screen.getByText(/\$9\.99\/month/)).toBeInTheDocument();
  });
});
