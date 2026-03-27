import type { TherapyBlueprint } from "../schemas";
import { getCategoryById } from "./categories";

// ---------------------------------------------------------------------------
// Color palette mapping
// ---------------------------------------------------------------------------
const COLOR_PALETTES: Record<string, string[]> = {
  cool: ["#0d7377", "#14a085", "#1abc9c", "#d1f2eb"],
  warm: ["#e67e22", "#f39c12", "#f8c471", "#fef9e7"],
  "high-contrast": ["#000000", "#ffffff", "#e74c3c", "#2ecc71"],
  auto: ["#0d7377", "#14a085", "#f39c12", "#fef9e7"],
};

// ---------------------------------------------------------------------------
// Reinforcement description mapping
// ---------------------------------------------------------------------------
const REINFORCEMENT_DESCRIPTIONS: Record<string, string> = {
  tokens: "Stars or token icons appear as the child earns rewards",
  animation: "Celebratory animation plays on success",
  sound: "A cheerful sound effect plays on success",
  points: "Points counter increments on each success",
  completion: "A checkmark or completion indicator appears",
  none: "No reinforcement feedback",
};

// ---------------------------------------------------------------------------
// Accessibility notes mapping
// ---------------------------------------------------------------------------
function mapAccessibilityNotes(accessibility: string | string[]): string[] {
  const values = Array.isArray(accessibility) ? accessibility : [accessibility];
  if (values.includes("none") || values.length === 0) {
    return ["Standard accessibility guidelines apply"];
  }
  const noteMap: Record<string, string> = {
    "high-contrast": "High contrast colors required for visual impairment",
    "large-targets": "Touch targets must be at least 80×80px",
    "no-sound": "App must be fully functional without audio",
    "simple-animations": "Animations must be simple and non-distracting",
  };
  return values.map((v) => noteMap[v] ?? v).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Age range normalization — maps to valid TherapyBlueprintSchema enum values
// ---------------------------------------------------------------------------
type AgeRange = "toddler" | "preschool" | "school-age" | "adolescent" | "adult" | "all";

function normalizeAgeRange(value: string): AgeRange {
  const valid: AgeRange[] = ["toddler", "preschool", "school-age", "adolescent", "adult", "all"];
  if (valid.includes(value as AgeRange)) return value as AgeRange;
  return "school-age";
}

// ---------------------------------------------------------------------------
// Interaction model normalization
// ---------------------------------------------------------------------------
type InteractionModel = "tap" | "drag" | "sequence" | "match" | "timer" | "free-form";

function normalizeInteractionModel(value: string): InteractionModel {
  const valid: InteractionModel[] = ["tap", "drag", "sequence", "match", "timer", "free-form"];
  if (valid.includes(value as InteractionModel)) return value as InteractionModel;
  return "tap";
}

// ---------------------------------------------------------------------------
// Reinforcement type normalization
// ---------------------------------------------------------------------------
type ReinforcementType = "tokens" | "animation" | "sound" | "points" | "completion" | "none";

function normalizeReinforcementType(value: string): ReinforcementType {
  const valid: ReinforcementType[] = ["tokens", "animation", "sound", "points", "completion", "none"];
  if (valid.includes(value as ReinforcementType)) return value as ReinforcementType;
  return "tokens";
}

// ---------------------------------------------------------------------------
// Main assembler
// ---------------------------------------------------------------------------
export function assembleBlueprint(
  categoryId: string,
  answers: Record<string, string | string[]>,
  llmDraft: Partial<TherapyBlueprint> | null,
): { blueprint: TherapyBlueprint; richPrompt: string } {
  const category = getCategoryById(categoryId);
  if (!category) {
    throw new Error(`Unknown category: ${categoryId}`);
  }

  // Helper to get a scalar string answer
  const getStr = (key: string, fallback = ""): string => {
    const val = answers[key];
    if (Array.isArray(val)) return val[0] ?? fallback;
    return val ?? fallback;
  };

  // 1. Start with category defaults
  const categoryDefaults: Partial<TherapyBlueprint> = { ...category.defaults };

  // 2. Merge LLM draft (overrides category defaults)
  const afterLlm: Partial<TherapyBlueprint> = {
    ...categoryDefaults,
    ...(llmDraft ?? {}),
  };

  // 3. Map user answers to blueprint fields (highest precedence)
  const ageRangeRaw = getStr("age_range", "school-age");
  const ageRange = normalizeAgeRange(ageRangeRaw);

  const interactionStyleRaw = getStr("interaction_style", "");
  const interactionModel = interactionStyleRaw
    ? normalizeInteractionModel(interactionStyleRaw)
    : afterLlm.interactionModel ?? normalizeInteractionModel(String(category.defaults.interactionModel ?? "tap"));

  const reinforcementRaw = getStr("reinforcement", "");
  const reinforcementType = reinforcementRaw
    ? normalizeReinforcementType(reinforcementRaw)
    : afterLlm.reinforcementStrategy?.type ?? "tokens";

  const reinforcementDescription = REINFORCEMENT_DESCRIPTIONS[reinforcementType] ??
    afterLlm.reinforcementStrategy?.description ??
    REINFORCEMENT_DESCRIPTIONS.tokens;

  const accessibilityRaw = answers.accessibility ?? ["none"];
  const accessibilityNotes = mapAccessibilityNotes(accessibilityRaw);

  const colorPrefRaw = getStr("color_preference", "auto");
  const colorPalette = COLOR_PALETTES[colorPrefRaw] ?? COLOR_PALETTES.auto;

  // 4. Derive title/description from category + answers
  const ageLabel = ageRange === "toddler" ? "Toddler"
    : ageRange === "preschool" ? "Preschool"
    : ageRange === "school-age" ? "School-Age"
    : ageRange === "adolescent" ? "Teen/Adult"
    : ageRange === "adult" ? "Adult"
    : "All Ages";

  const title = afterLlm.title ?? `${category.label} for ${ageLabel}`;
  const projectName = afterLlm.projectName ?? title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const description = afterLlm.description ?? category.description;
  const detailedDescription = afterLlm.detailedDescription ??
    `A ${category.label.toLowerCase()} app designed for ${ageLabel.toLowerCase()} users. ${category.description}`;

  const therapyGoal = afterLlm.therapyGoal ??
    `Support ${ageLabel.toLowerCase()} users in developing skills through ${category.label.toLowerCase()}`;
  const targetSkill = afterLlm.targetSkill ??
    `${category.label} interaction and engagement`;

  // 5. Data tracking defaults per category
  const dataTracking = afterLlm.dataTracking ?? [
    "Number of trials",
    "Accuracy percentage",
    "Session duration",
    "Prompts needed",
  ];

  // 6. Views — at least one view
  const views = afterLlm.views ?? [
    {
      name: "Main",
      description: `Primary ${category.label.toLowerCase()} interface`,
    },
    {
      name: "Settings",
      description: "Caregiver/therapist configuration panel",
    },
  ];

  // 7. User flow
  const userFlow = afterLlm.userFlow ?? {
    uiLayout: `Responsive single-page layout optimized for ${ageLabel.toLowerCase()} users`,
    uiDesign: `Clean, accessible design with ${colorPrefRaw === "cool" ? "calm teal tones" : colorPrefRaw === "warm" ? "warm orange tones" : colorPrefRaw === "high-contrast" ? "high-contrast black/white with color accents" : "a friendly color palette"} and large touch targets`,
    userJourney: `User opens app → interacts with ${category.label.toLowerCase()} → receives ${reinforcementType} feedback → session ends with summary`,
  };

  // 8. Assemble final blueprint
  const blueprint: TherapyBlueprint = {
    title,
    projectName,
    description,
    detailedDescription,
    therapyGoal,
    targetSkill,
    ageRange,
    interactionModel,
    reinforcementStrategy: {
      type: reinforcementType,
      description: reinforcementDescription,
    },
    dataTracking,
    accessibilityNotes,
    colorPalette,
    views,
    userFlow,
    frameworks: afterLlm.frameworks ?? ["motion"],
    pitfalls: afterLlm.pitfalls ?? [],
    implementationRoadmap: afterLlm.implementationRoadmap ?? [
      { phase: "Build", description: "Generate the full app from blueprint" },
    ],
    initialPhase: afterLlm.initialPhase ?? {
      name: "Build",
      description: "Generate app",
      files: [],
      installCommands: [],
      lastPhase: true,
    },
  };

  // 9. Generate richPrompt via category's promptTemplate
  const richPrompt = category.promptTemplate(answers);

  return { blueprint, richPrompt };
}
