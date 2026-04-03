import type { Id } from "../../../../convex/_generated/dataModel";

export const TARGET_SOUNDS = [
  { id: "/s/", label: "/s/ & /z/" },
  { id: "/r/", label: "/r/" },
  { id: "/l/", label: "/l/" },
  { id: "/th/", label: "/th/" },
  { id: "/ch/", label: "/ch/ & /sh/" },
  { id: "/f/", label: "/f/ & /v/" },
  { id: "/k/", label: "/k/ & /g/" },
  { id: "blends", label: "Blends" },
] as const;

export const TARGET_POSITION_OPTIONS = [
  { id: "initial", label: "Beginning of words" },
  { id: "medial", label: "Middle of words" },
  { id: "final", label: "End of words" },
  { id: "blend", label: "Blends and clusters" },
] as const;

export const SESSION_GOAL_OPTIONS = [
  { id: "drill", label: "Sound drill" },
  { id: "mixed", label: "Mixed practice" },
  { id: "carryover", label: "Carryover talk" },
  { id: "listening", label: "Listening practice" },
] as const;

export const COACH_TONE_OPTIONS = [
  { id: "playful", label: "Playful" },
  { id: "calm", label: "Calm" },
  { id: "energetic", label: "Energetic" },
  { id: "neutral", label: "Matter-of-fact" },
] as const;

export const SESSION_PACE_OPTIONS = [
  { id: "slow", label: "Slow and roomy" },
  { id: "steady", label: "Steady" },
  { id: "brisk", label: "Brisk" },
] as const;

export const PROMPT_STYLE_OPTIONS = [
  { id: "model-first", label: "Model first" },
  { id: "ask-first", label: "Ask first" },
  { id: "choice-based", label: "Choice-based" },
  { id: "imitation-heavy", label: "Imitation-heavy" },
] as const;

export const CORRECTION_STYLE_OPTIONS = [
  { id: "recast", label: "Gentle recast" },
  { id: "gentle-direct", label: "Gentle direct cue" },
  { id: "explicit", label: "Explicit correction" },
] as const;

export const MAX_RETRIES_OPTIONS = [
  { id: 1, label: "1 try before moving on" },
  { id: 2, label: "2 tries before moving on" },
  { id: 3, label: "3 tries before moving on" },
] as const;

export const FRUSTRATION_SUPPORT_OPTIONS = [
  { id: "back-off-fast", label: "Back off quickly" },
  { id: "balanced", label: "Balanced" },
  { id: "keep-challenge", label: "Keep gentle challenge" },
] as const;

export type TargetPosition = (typeof TARGET_POSITION_OPTIONS)[number]["id"];
export type SessionGoal = (typeof SESSION_GOAL_OPTIONS)[number]["id"];
export type CoachTone = (typeof COACH_TONE_OPTIONS)[number]["id"];
export type SessionPace = (typeof SESSION_PACE_OPTIONS)[number]["id"];
export type PromptStyle = (typeof PROMPT_STYLE_OPTIONS)[number]["id"];
export type CorrectionStyle = (typeof CORRECTION_STYLE_OPTIONS)[number]["id"];
export type MaxRetriesPerWord = (typeof MAX_RETRIES_OPTIONS)[number]["id"];
export type FrustrationSupport = (typeof FRUSTRATION_SUPPORT_OPTIONS)[number]["id"];

export type CoachSetup = {
  targetPositions: TargetPosition[];
  sessionGoal: SessionGoal;
  coachTone: CoachTone;
  sessionPace: SessionPace;
  promptStyle: PromptStyle;
  correctionStyle: CorrectionStyle;
  maxRetriesPerWord: MaxRetriesPerWord;
  frustrationSupport: FrustrationSupport;
  preferredThemes: string[];
  avoidThemes: string[];
  slpNotes?: string;
};

export type SpeechCoachConfig = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  defaultDurationMinutes: number;
  childAge?: number;
  reducedMotion?: boolean;
  assignedTemplateId?: Id<"speechCoachTemplates">;
  lastSyncedTemplateVersion?: number;
  coachSetup?: CoachSetup;
};

export function ageRangeFromAge(age: number): "2-4" | "5-7" {
  return age <= 4 ? "2-4" : "5-7";
}

export const DEFAULT_COACH_SETUP: CoachSetup = {
  targetPositions: ["initial"],
  sessionGoal: "drill",
  coachTone: "playful",
  sessionPace: "steady",
  promptStyle: "model-first",
  correctionStyle: "gentle-direct",
  maxRetriesPerWord: 2,
  frustrationSupport: "balanced",
  preferredThemes: [],
  avoidThemes: [],
  slpNotes: "",
};

export function getCoachSetup(config?: SpeechCoachConfig | null): CoachSetup {
  return {
    ...DEFAULT_COACH_SETUP,
    ...config?.coachSetup,
    targetPositions: config?.coachSetup?.targetPositions ?? DEFAULT_COACH_SETUP.targetPositions,
    preferredThemes: config?.coachSetup?.preferredThemes ?? [],
    avoidThemes: config?.coachSetup?.avoidThemes ?? [],
  };
}
