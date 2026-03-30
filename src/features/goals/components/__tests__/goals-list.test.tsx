import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GoalsList } from "../goals-list";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/core/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`} />
  ),
}));

const mockUseActiveGoals = vi.fn();
vi.mock("../../hooks/use-goals", () => ({
  useActiveGoals: (...args: any[]) => mockUseActiveGoals(...args),
}));

vi.mock("../goal-form", () => ({
  GoalForm: () => <div data-testid="goal-form" />,
}));

vi.mock("../../lib/goal-utils", () => ({
  domainLabel: (domain: string) => {
    const labels: Record<string, string> = {
      articulation: "Articulation",
      "language-receptive": "Receptive Language",
    };
    return labels[domain] ?? domain;
  },
  domainColor: () => "bg-blue-100 text-blue-800",
}));

describe("GoalsList", () => {
  it("shows loading state when goals is undefined", () => {
    mockUseActiveGoals.mockReturnValue(undefined);
    render(<GoalsList patientId={"patient1" as any} />);
    expect(screen.getByText("Loading goals...")).toBeInTheDocument();
  });

  it("shows empty state when goals array is empty", () => {
    mockUseActiveGoals.mockReturnValue([]);
    render(<GoalsList patientId={"patient1" as any} />);
    expect(
      screen.getByText(/No goals yet/)
    ).toBeInTheDocument();
  });

  it("renders goals with domain badges and target accuracy", () => {
    mockUseActiveGoals.mockReturnValue([
      {
        _id: "goal1",
        domain: "articulation",
        shortDescription: "Produce /r/ in initial position",
        targetAccuracy: 80,
      },
      {
        _id: "goal2",
        domain: "language-receptive",
        shortDescription: "Follow 2-step directions",
        targetAccuracy: 90,
      },
    ]);
    render(<GoalsList patientId={"patient1" as any} />);

    expect(screen.getByText("Articulation")).toBeInTheDocument();
    expect(screen.getByText("Receptive Language")).toBeInTheDocument();
    expect(screen.getByText("Produce /r/ in initial position")).toBeInTheDocument();
    expect(screen.getByText("Follow 2-step directions")).toBeInTheDocument();
    expect(screen.getByText("Target: 80%")).toBeInTheDocument();
    expect(screen.getByText("Target: 90%")).toBeInTheDocument();
  });

  it("renders goal links to detail pages", () => {
    mockUseActiveGoals.mockReturnValue([
      {
        _id: "goal1",
        domain: "articulation",
        shortDescription: "Test goal",
        targetAccuracy: 80,
      },
    ]);
    render(<GoalsList patientId={"patient1" as any} />);
    const link = screen.getByRole("link", { name: /Test goal/ });
    expect(link).toHaveAttribute("href", "/patients/patient1/goals/goal1");
  });

  it("renders Add Goal button", () => {
    mockUseActiveGoals.mockReturnValue([]);
    render(<GoalsList patientId={"patient1" as any} />);
    expect(screen.getByText("Add Goal")).toBeInTheDocument();
  });

  it("renders Goals heading", () => {
    mockUseActiveGoals.mockReturnValue([]);
    render(<GoalsList patientId={"patient1" as any} />);
    expect(screen.getByText("Goals")).toBeInTheDocument();
  });
});
