import {
  COACH_TONE_OPTIONS,
  CORRECTION_STYLE_OPTIONS,
  FRUSTRATION_SUPPORT_OPTIONS,
  getCoachSetup,
  MAX_RETRIES_OPTIONS,
  PROMPT_STYLE_OPTIONS,
  SESSION_GOAL_OPTIONS,
  SESSION_PACE_OPTIONS,
  type SpeechCoachConfig,
  TARGET_POSITION_OPTIONS,
} from "./config";

type SessionConfig = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  durationMinutes: number;
  focusArea?: string;
};

function labelFor<T extends string | number>(
  options: ReadonlyArray<{ id: T; label: string }>,
  value: T
) {
  return options.find((option) => option.id === value)?.label ?? String(value);
}

export function buildSessionGuidance(
  sessionConfig?: SessionConfig,
  speechCoachConfig?: SpeechCoachConfig | null
) {
  if (!sessionConfig) return null;

  const coachSetup = getCoachSetup(speechCoachConfig);
  const targetPositions = coachSetup.targetPositions
    .map((position) => labelFor(TARGET_POSITION_OPTIONS, position))
    .join(", ");
  const preferredThemes = coachSetup.preferredThemes.join(", ");
  const avoidThemes = coachSetup.avoidThemes.join(", ");

  const lines = [
    "Session guidance for Vocali Speech Coach.",
    `Child age range: ${sessionConfig.ageRange}.`,
    `Practice sounds: ${sessionConfig.targetSounds.join(", ")}.`,
    `Target positions: ${targetPositions}.`,
    `Session goal: ${labelFor(SESSION_GOAL_OPTIONS, coachSetup.sessionGoal)}.`,
    `Duration: ${sessionConfig.durationMinutes} minutes.`,
    `Coach tone: ${labelFor(COACH_TONE_OPTIONS, coachSetup.coachTone)}.`,
    `Session pace: ${labelFor(SESSION_PACE_OPTIONS, coachSetup.sessionPace)}.`,
    `Prompt style: ${labelFor(PROMPT_STYLE_OPTIONS, coachSetup.promptStyle)}.`,
    `Correction style: ${labelFor(CORRECTION_STYLE_OPTIONS, coachSetup.correctionStyle)}.`,
    `Retries before moving on: ${labelFor(MAX_RETRIES_OPTIONS, coachSetup.maxRetriesPerWord)}.`,
    `Frustration handling: ${labelFor(FRUSTRATION_SUPPORT_OPTIONS, coachSetup.frustrationSupport)}.`,
    "Keep language child-friendly, warm, and concrete. Celebrate attempts without sounding overexcited or harsh.",
  ];

  if (sessionConfig.focusArea) {
    lines.push(`Specific focus area for this session: ${sessionConfig.focusArea}.`);
  }
  if (preferredThemes) {
    lines.push(`Lean into these child interests when choosing examples: ${preferredThemes}.`);
  }
  if (avoidThemes) {
    lines.push(`Avoid these themes or example topics: ${avoidThemes}.`);
  }
  if (coachSetup.slpNotes?.trim()) {
    lines.push(`Clinician note: ${coachSetup.slpNotes.trim()}`);
  }

  return lines.join(" ");
}
