export const DIAGNOSIS_VALUES = [
  "articulation",
  "language",
  "fluency",
  "voice",
  "aac-complex",
  "other",
] as const;

export type DiagnosisValue = (typeof DIAGNOSIS_VALUES)[number];

export const DIAGNOSIS_LABELS: Record<DiagnosisValue, string> = {
  articulation: "Articulation",
  language: "Language",
  fluency: "Fluency",
  voice: "Voice",
  "aac-complex": "AAC/Complex Communication",
  other: "Other",
};
