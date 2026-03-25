import { z } from "zod";

export const PhaseConceptSchema = z.object({
  name: z.string(),
  description: z.string(),
  files: z.array(z.object({
    path: z.string(),
    purpose: z.string(),
    changes: z.string().nullable().describe("Spec-like: WHAT to change, no code"),
  })),
  installCommands: z.array(z.string()),
  lastPhase: z.boolean(),
});

export const TherapyBlueprintSchema = z.object({
  // Project identity
  title: z.string(),
  projectName: z.string(),
  description: z.string(),
  detailedDescription: z.string(),

  // Therapy-specific (the differentiator)
  therapyGoal: z.string().describe("What therapeutic outcome this app supports"),
  targetSkill: z.string().describe("Specific skill being practiced"),
  ageRange: z.enum(["toddler", "preschool", "school-age", "adolescent", "adult", "all"]),
  interactionModel: z.enum(["tap", "drag", "sequence", "match", "timer", "free-form"]),
  reinforcementStrategy: z.object({
    type: z.enum(["tokens", "animation", "sound", "points", "completion", "none"]),
    description: z.string(),
  }),
  dataTracking: z.array(z.string()).describe("What to measure: trials, accuracy, duration, prompts needed"),
  accessibilityNotes: z.array(z.string()).describe("Sensory, motor, visual considerations"),

  // Design
  colorPalette: z.array(z.string()).max(4),
  views: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),
  userFlow: z.object({
    uiLayout: z.string(),
    uiDesign: z.string(),
    userJourney: z.string(),
  }),

  // Technical
  frameworks: z.array(z.string()),
  pitfalls: z.array(z.string()),

  // Roadmap
  implementationRoadmap: z.array(z.object({
    phase: z.string(),
    description: z.string(),
  })),

  // First phase (generated inline, like VibeSDK)
  initialPhase: PhaseConceptSchema,
});

export const PhaseImplementationSchema = z.object({
  files: z.array(z.object({
    filePath: z.string(),
    fileContents: z.string(),
    filePurpose: z.string(),
  })),
  commands: z.array(z.string()),
});

// Export inferred types for use in pipeline code
export type TherapyBlueprint = z.infer<typeof TherapyBlueprintSchema>;
export type PhaseConcept = z.infer<typeof PhaseConceptSchema>;
export type PhaseImplementation = z.infer<typeof PhaseImplementationSchema>;
