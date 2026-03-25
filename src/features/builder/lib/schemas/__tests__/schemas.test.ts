import { describe, expect,test } from "vitest";

import { PhaseConceptSchema, PhaseImplementationSchema,TherapyBlueprintSchema } from "../index";

describe("TherapyBlueprintSchema", () => {
  test("validates a complete blueprint", () => {
    const result = TherapyBlueprintSchema.safeParse({
      title: "Morning Routine",
      projectName: "morning-routine",
      description: "Visual schedule for morning routines",
      detailedDescription: "A drag-and-drop visual schedule...",
      therapyGoal: "Executive function — task sequencing",
      targetSkill: "Following multi-step routines independently",
      ageRange: "preschool",
      interactionModel: "drag",
      reinforcementStrategy: { type: "tokens", description: "5 stars" },
      dataTracking: ["steps completed", "time to completion"],
      accessibilityNotes: ["Large touch targets", "High contrast mode"],
      colorPalette: ["#4CAF50", "#2196F3"],
      views: [{ name: "Schedule", description: "Main view" }],
      userFlow: { uiLayout: "Single column", uiDesign: "Card-based", userJourney: "Drag steps" },
      frameworks: ["motion"],
      pitfalls: ["Don't use small touch targets"],
      implementationRoadmap: [{ phase: "Layout", description: "Build step cards" }],
      initialPhase: {
        name: "Layout",
        description: "Build step cards",
        files: [{ path: "src/App.tsx", purpose: "Main layout", changes: null }],
        installCommands: [],
        lastPhase: false,
      },
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing therapy fields", () => {
    const result = TherapyBlueprintSchema.safeParse({
      title: "Test",
      projectName: "test",
    });
    expect(result.success).toBe(false);
  });
});

describe("PhaseConceptSchema", () => {
  test("validates a phase concept", () => {
    const result = PhaseConceptSchema.safeParse({
      name: "Layout",
      description: "Build the main layout",
      files: [{ path: "src/App.tsx", purpose: "Main layout", changes: "Add header and navigation" }],
      installCommands: ["npm install motion"],
      lastPhase: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("PhaseImplementationSchema", () => {
  test("validates phase implementation output", () => {
    const result = PhaseImplementationSchema.safeParse({
      files: [{ filePath: "src/App.tsx", fileContents: "export default function App() { return <div>Hello</div> }", filePurpose: "Main app component" }],
      commands: [],
    });
    expect(result.success).toBe(true);
  });
});
