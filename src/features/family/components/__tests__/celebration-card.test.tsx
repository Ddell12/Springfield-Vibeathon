import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CelebrationCard } from "../celebration-card";

vi.mock("@/core/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock("lucide-react", () => ({
  X: () => <span data-testid="x-icon" />,
}));

vi.mock("../../lib/encouragement", () => ({
  getCelebrationMessage: (trigger: any, childName: string) => {
    if (trigger.type === "streak") {
      const msgs: Record<number, string> = {
        3: `${childName} is on a 3-day streak!`,
        7: `One full week of practice! ${childName} has built an incredible habit.`,
        14: `Two weeks strong! ${childName}'s dedication is truly inspiring.`,
        30: `30-day streak! ${childName} has achieved something extraordinary.`,
      };
      return msgs[trigger.value] ?? null;
    }
    if (trigger.type === "goal-met") {
      return `${childName} has met the goal for ${trigger.goalDescription}!`;
    }
    return null;
  },
}));

// Mock localStorage
const localStorageMock: Record<string, string> = {};
beforeEach(() => {
  Object.keys(localStorageMock).forEach((k) => delete localStorageMock[k]);
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(
    (key: string) => localStorageMock[key] ?? null
  );
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(
    (key: string, value: string) => {
      localStorageMock[key] = value;
    }
  );
});

describe("CelebrationCard", () => {
  it("renders celebration message for 3-day streak", () => {
    render(
      <CelebrationCard childName="Alex" currentStreak={3} />
    );
    expect(screen.getByText(/Alex is on a 3-day streak!/)).toBeInTheDocument();
  });

  it("renders the highest milestone celebration", () => {
    render(
      <CelebrationCard childName="Alex" currentStreak={7} />
    );
    // With streak=7, both 3 and 7 are triggered. The last (highest) is shown.
    expect(screen.getByText(/One full week of practice/)).toBeInTheDocument();
  });

  it("renders goal-met celebration", () => {
    render(
      <CelebrationCard
        childName="Alex"
        currentStreak={0}
        goals={[{ status: "met", shortDescription: "Produce /r/" }]}
      />
    );
    expect(screen.getByText(/Alex has met the goal for Produce \/r\//)).toBeInTheDocument();
  });

  it("renders nothing when streak is below any milestone", () => {
    const { container } = render(
      <CelebrationCard childName="Alex" currentStreak={1} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("has a dismiss button with correct aria-label", () => {
    render(
      <CelebrationCard childName="Alex" currentStreak={3} />
    );
    expect(screen.getByRole("button", { name: /Dismiss celebration/ })).toBeInTheDocument();
  });

  it("has role=status for accessibility", () => {
    render(
      <CelebrationCard childName="Alex" currentStreak={3} />
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
