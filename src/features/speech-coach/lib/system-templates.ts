import type { SpeechCoachTemplateForm } from "../components/template-editor";
import type { SpeechCoachSkillKey } from "./template-types";

type SystemTemplateSkill = {
  key: SpeechCoachSkillKey;
  enabled: boolean;
};

export type SystemTemplate = {
  id: string;
  name: string;
  description: string;
  skills: SystemTemplateSkill[];
  sessionDefaults: {
    ageRange: "2-4" | "5-7";
    defaultDurationMinutes: number;
  };
};

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    id: "sound-drill",
    name: "Sound Drill",
    description:
      "Structured repetition with clear cues. Best for early articulation targets and imitation practice.",
    skills: [
      { key: "model-then-imitate", enabled: true },
      { key: "recast-and-retry", enabled: true },
      { key: "low-frustration-fallback", enabled: true },
    ],
    sessionDefaults: { ageRange: "5-7", defaultDurationMinutes: 10 },
  },
  {
    id: "conversational",
    name: "Conversational",
    description:
      "Warm, topic-based practice using the child's interests. Good for carryover and generalization.",
    skills: [
      { key: "carryover-conversation", enabled: true },
      { key: "choice-based-elicitation", enabled: true },
      { key: "low-frustration-fallback", enabled: true },
    ],
    sessionDefaults: { ageRange: "5-7", defaultDurationMinutes: 10 },
  },
  {
    id: "listening-first",
    name: "Listening First",
    description:
      "Ear training before speaking. Coach models target sounds repeatedly before asking the child to try.",
    skills: [
      { key: "auditory-bombardment", enabled: true },
      { key: "model-then-imitate", enabled: true },
      { key: "low-frustration-fallback", enabled: true },
    ],
    sessionDefaults: { ageRange: "2-4", defaultDurationMinutes: 5 },
  },
  {
    id: "mixed-practice",
    name: "Mixed Practice",
    description:
      "Alternates drills and natural conversation. Builds accuracy then moves to real-world use.",
    skills: [
      { key: "model-then-imitate", enabled: true },
      { key: "recast-and-retry", enabled: true },
      { key: "carryover-conversation", enabled: true },
      { key: "low-frustration-fallback", enabled: true },
    ],
    sessionDefaults: { ageRange: "5-7", defaultDurationMinutes: 10 },
  },
];

export function getSystemTemplate(id: string): SystemTemplate | undefined {
  return SYSTEM_TEMPLATES.find((template) => template.id === id);
}

export function buildTemplateFormFromSystemTemplate(
  template: SystemTemplate
): SpeechCoachTemplateForm {
  return {
    name: template.name,
    description: template.description,
    status: "draft",
    voice: { provider: "elevenlabs", voiceKey: "friendly-coach" },
    prompt: {},
    tools: [],
    skills: template.skills,
    knowledgePackIds: [],
    customKnowledgeSnippets: [],
    sessionDefaults: template.sessionDefaults,
    version: 1,
  };
}
