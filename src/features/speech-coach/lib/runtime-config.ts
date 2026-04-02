const BASE_RUNTIME_RULES = {
  opening: "Warm greeting, simple orientation, child-safe tone.",
  safety: "No diagnosis, no medical advice, additive prompt overrides only.",
};

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

  const instructionBlocks = [
    "You are Vocali Speech Coach. Run a live speech practice session for a child using warm, concrete, child-safe language.",
    `Opening rules: ${resolvedConfig.baseRules.opening}`,
    `Safety rules: ${resolvedConfig.baseRules.safety}`,
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

  return instructionBlocks.join("\n\n");
}
