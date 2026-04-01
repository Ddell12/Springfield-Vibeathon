export type SpeechCoachToolKey =
  | "target-word-picker"
  | "minimal-pair-generator"
  | "topic-prompt-generator"
  | "pacing-adjuster"
  | "reinforcement-helper"
  | "session-summary"
  | "caregiver-handoff";

export type SpeechCoachSkillKey =
  | "auditory-bombardment"
  | "model-then-imitate"
  | "recast-and-retry"
  | "choice-based-elicitation"
  | "carryover-conversation"
  | "low-frustration-fallback";

export type SpeechCoachTemplateStatus = "draft" | "active" | "archived";
