import { render } from "@testing-library/react";

import { BlueprintCard } from "../blueprint-card";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid="icon">{icon}</span>
  ),
}));

const blueprint = {
  title: "Morning Routine",
  therapyGoal: "Executive function",
  targetSkill: "Task sequencing",
  ageRange: "preschool",
  interactionModel: "drag",
  description: "A visual schedule app",
  projectName: "morning-routine",
  detailedDescription: "Detailed desc",
  reinforcementStrategy: { type: "tokens", description: "5 stars" },
  dataTracking: ["steps"],
  accessibilityNotes: ["Large targets"],
  colorPalette: ["#4CAF50"],
  views: [{ name: "Main", description: "Main view" }],
  userFlow: { uiLayout: "Single column", uiDesign: "Card", userJourney: "Drag steps" },
  frameworks: ["motion"],
  pitfalls: ["Small targets"],
  implementationRoadmap: [{ phase: "Layout", description: "Build cards" }],
  initialPhase: { name: "Layout", description: "Build cards", files: [], installCommands: [], lastPhase: false },
} as any;

describe("BlueprintCard", () => {
  it("renders the title", () => {
    const { getByText } = render(<BlueprintCard blueprint={blueprint} />);
    expect(getByText("Morning Routine")).toBeInTheDocument();
  });

  it("renders therapyGoal", () => {
    const { getByText } = render(<BlueprintCard blueprint={blueprint} />);
    expect(getByText("Executive function")).toBeInTheDocument();
  });

  it("renders targetSkill", () => {
    const { getByText } = render(<BlueprintCard blueprint={blueprint} />);
    expect(getByText("Task sequencing")).toBeInTheDocument();
  });

  it("renders ageRange", () => {
    const { getByText } = render(<BlueprintCard blueprint={blueprint} />);
    expect(getByText("preschool")).toBeInTheDocument();
  });

  it("renders interactionModel", () => {
    const { getByText } = render(<BlueprintCard blueprint={blueprint} />);
    expect(getByText("drag")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    const { getByText } = render(<BlueprintCard blueprint={blueprint} />);
    expect(getByText("A visual schedule app")).toBeInTheDocument();
  });

  it("does not render description paragraph when description is absent", () => {
    const { description: _desc, ...blueprintWithoutDescription } = blueprint;
    const { queryByText } = render(
      <BlueprintCard blueprint={blueprintWithoutDescription as any} />
    );
    expect(queryByText("A visual schedule app")).toBeNull();
  });
});
