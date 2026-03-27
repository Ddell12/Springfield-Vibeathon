import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BlueprintApprovalCard } from "../blueprint-approval-card";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="icon">{icon}</span>,
}));

const blueprint = {
  title: "My Board",
  therapyGoal: "Communication",
  targetSkill: "Core word usage",
  ageRange: "preschool",
  interactionModel: "tap",
  description: "A communication board",
  projectName: "my-board",
  detailedDescription: "Detailed",
  reinforcementStrategy: { type: "tokens", description: "Stars" },
  dataTracking: [],
  accessibilityNotes: [],
  colorPalette: ["#00595c"],
  views: [{ name: "Main", description: "Main view" }],
  userFlow: { uiLayout: "Grid", uiDesign: "Cards", userJourney: "Tap words" },
  frameworks: ["motion"],
  pitfalls: [],
  implementationRoadmap: [{ phase: "Build", description: "Generate" }],
  initialPhase: { name: "Build", description: "Generate", files: [], installCommands: [], lastPhase: true },
} as any;

describe("BlueprintApprovalCard", () => {
  it("renders the blueprint title", () => {
    const { getByText } = render(
      <BlueprintApprovalCard blueprint={blueprint} onApprove={vi.fn()} onEdit={vi.fn()} />,
    );
    expect(getByText("My Board")).toBeInTheDocument();
  });

  it("renders Build this! button", () => {
    const { getByText } = render(
      <BlueprintApprovalCard blueprint={blueprint} onApprove={vi.fn()} onEdit={vi.fn()} />,
    );
    expect(getByText("Build this!")).toBeInTheDocument();
  });

  it("calls onApprove when Build this! clicked", () => {
    const onApprove = vi.fn();
    const { getByText } = render(
      <BlueprintApprovalCard blueprint={blueprint} onApprove={onApprove} onEdit={vi.fn()} />,
    );
    fireEvent.click(getByText("Build this!"));
    expect(onApprove).toHaveBeenCalled();
  });

  it("calls onEdit when Change something clicked", () => {
    const onEdit = vi.fn();
    const { getByText } = render(
      <BlueprintApprovalCard blueprint={blueprint} onApprove={vi.fn()} onEdit={onEdit} />,
    );
    fireEvent.click(getByText("Change something"));
    expect(onEdit).toHaveBeenCalled();
  });
});
