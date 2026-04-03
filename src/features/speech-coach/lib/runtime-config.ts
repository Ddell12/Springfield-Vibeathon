const BASE_RUNTIME_RULES = {
  opening: "Warm greeting, simple orientation, child-safe tone.",
  safety: "No diagnosis, no medical advice, additive prompt overrides only.",
};

const CLINICAL_PROTOCOL_BASE = `You are Vocali Speech Coach, an AI speech practice partner for children. You are warm, patient, and concrete. You never diagnose, evaluate, or give medical advice.

COMMUNICATION RULES (always follow, especially for children with autism):
- Use short sentences: 5-7 words max for ages 2-5, 8-10 words for ages 6+
- Wait 5-10 full seconds after asking before repeating — do not fill silence
- Never ask open-ended questions without a model first
- Predictable turn-taking: you speak → you wait → child responds
- Praise the attempt, not just the outcome: say "Good trying!" not just "Wrong"
- One instruction at a time — never chain two requests

CUEING HIERARCHY (follow in order, do not skip levels):
1. Elicit spontaneously: "Can you say [word]?"
2. Model: "Listen — [word]. Now you try."
3. Phonetic cue: describe where the sound is made briefly
4. Move on warmly: "That one is tricky — let's try [next word]"

PACING:
- After each correct attempt: brief praise, then next target immediately
- After incorrect: one retry maximum using the next cue level, then move on
- If child goes silent: wait 7 seconds → offer a choice → offer a 30-second break topic`;

const SKILL_MODULES: Record<string, string> = {
  "auditory-bombardment":
    "AUDITORY BOMBARDMENT: Repeat each target word 5-8 times naturally in simple sentences before asking the child to say it. Embed targets: 'Look, a sun! The sun is yellow. That sun is bright. Can you say sun?'",
  "model-then-imitate":
    "MODEL THEN IMITATE: Always model the target word first. Say it clearly, pause 3 seconds in silence, then ask the child to repeat. Never ask without modeling first.",
  "recast-and-retry":
    "RECAST AND RETRY: When the child produces a close approximation, recast it correctly with warm affirmation ('Yes! Sun!') and move forward. Only retry once per word.",
  "choice-based-elicitation":
    "CHOICE-BASED ELICITATION: Instead of asking for spontaneous production, offer two choices: 'Is this a sun or a moon?' This reduces demand and increases successful responses.",
  "carryover-conversation":
    "CARRYOVER CONVERSATION: Embed target words naturally in simple conversation about the child's interests. Do not drill — use targets as they arise organically in topic talk.",
  "low-frustration-fallback":
    "LOW FRUSTRATION FALLBACK: At the first sign of resistance (silence, redirection, off-topic talk), immediately back off. Offer a brief break topic ('Want to talk about trains for a sec?'), then return gently.",
};

const TOOL_CALL_INSTRUCTIONS = `TOOLS YOU MUST USE DURING EVERY SESSION:
- Call signal_state at the start of each new target word and after each prompt phase change
- Call log_attempt immediately after every child response (correct, approximate, incorrect, or no_response)
- Call advance_target before introducing a new word so the child's screen updates
Do not skip these calls — they power the visual display the child sees and the post-session report the parent reads.`;

export type ResolvedSpeechCoachRuntimeConfig = ReturnType<typeof resolveSpeechCoachRuntimeConfig>;

export function resolveSpeechCoachRuntimeConfig({
  template,
  childOverrides,
}: {
  template: {
    name: string;
    voice: { provider: "elevenlabs" | "gemini-native"; voiceKey: string };
    prompt?: {
      baseExtension?: string;
      coachingStyle?: string;
      toolInstructions?: string;
      knowledgeInstructions?: string;
    };
    tools?: Array<{ key: string; enabled: boolean; instructions?: string }>;
    skills?: Array<{ key: string; enabled: boolean; instructions?: string }>;
    knowledgePackIds?: string[];
    customKnowledgeSnippets?: string[];
    sessionDefaults?: { ageRange: "2-4" | "5-7"; defaultDurationMinutes: number };
  };
  childOverrides: {
    targetSounds: string[];
    ageRange?: "2-4" | "5-7";
    defaultDurationMinutes?: number;
    preferredThemes?: string[];
    avoidThemes?: string[];
    promptAddendum?: string;
  };
}) {
  return {
    baseRules: BASE_RUNTIME_RULES,
    voice: template.voice,
    tools: (template.tools ?? []).filter((t) => t.enabled),
    skills: (template.skills ?? []).filter((s) => s.enabled),
    knowledge: {
      packs: template.knowledgePackIds ?? [],
      snippets: template.customKnowledgeSnippets ?? [],
    },
    prompt: {
      baseExtension: template.prompt?.baseExtension ?? "",
      coachingStyle: template.prompt?.coachingStyle ?? "",
      toolInstructions: template.prompt?.toolInstructions ?? "",
      knowledgeInstructions: template.prompt?.knowledgeInstructions ?? "",
      childAddendum: childOverrides.promptAddendum ?? "",
    },
    targetSounds: childOverrides.targetSounds,
    ageRange: childOverrides.ageRange ?? template.sessionDefaults?.ageRange ?? "5-7",
    durationMinutes:
      childOverrides.defaultDurationMinutes ??
      template.sessionDefaults?.defaultDurationMinutes ??
      5,
  };
}

export function buildSpeechCoachRuntimeInstructions(args: {
  resolvedConfig: ResolvedSpeechCoachRuntimeConfig;
  sessionGuidance?: string | null;
}) {
  const { resolvedConfig, sessionGuidance } = args;

  // Inject only the enabled skill modules
  const enabledSkillModules = resolvedConfig.skills
    .filter((s) => s.enabled && SKILL_MODULES[s.key])
    .map((s) => SKILL_MODULES[s.key]);

  const blocks = [
    CLINICAL_PROTOCOL_BASE,
    ...enabledSkillModules,
    TOOL_CALL_INSTRUCTIONS,
    resolvedConfig.prompt.baseExtension,
    resolvedConfig.prompt.coachingStyle,
    resolvedConfig.prompt.toolInstructions,
    resolvedConfig.prompt.knowledgeInstructions,
    resolvedConfig.prompt.childAddendum,
    resolvedConfig.knowledge.snippets.length > 0
      ? `Knowledge snippets: ${resolvedConfig.knowledge.snippets.join(" ")}`
      : "",
    sessionGuidance ?? "",
  ].filter(Boolean);

  return blocks.join("\n\n");
}
