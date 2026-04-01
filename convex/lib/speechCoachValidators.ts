import { v } from "convex/values";

export const speechCoachToolKeyValidator = v.union(
  v.literal("target-word-picker"),
  v.literal("minimal-pair-generator"),
  v.literal("topic-prompt-generator"),
  v.literal("pacing-adjuster"),
  v.literal("reinforcement-helper"),
  v.literal("session-summary"),
  v.literal("caregiver-handoff")
);

export const speechCoachSkillKeyValidator = v.union(
  v.literal("auditory-bombardment"),
  v.literal("model-then-imitate"),
  v.literal("recast-and-retry"),
  v.literal("choice-based-elicitation"),
  v.literal("carryover-conversation"),
  v.literal("low-frustration-fallback")
);

export const speechCoachTemplateValidator = v.object({
  name: v.string(),
  description: v.string(),
  clinicalFocus: v.optional(v.string()),
  status: v.union(v.literal("draft"), v.literal("active"), v.literal("archived")),
  voice: v.object({
    provider: v.union(v.literal("elevenlabs"), v.literal("gemini-native")),
    voiceKey: v.string(),
  }),
  prompt: v.object({
    baseExtension: v.optional(v.string()),
    coachingStyle: v.optional(v.string()),
    toolInstructions: v.optional(v.string()),
    knowledgeInstructions: v.optional(v.string()),
  }),
  tools: v.array(v.object({
    key: speechCoachToolKeyValidator,
    enabled: v.boolean(),
    instructions: v.optional(v.string()),
  })),
  skills: v.array(v.object({
    key: speechCoachSkillKeyValidator,
    enabled: v.boolean(),
    instructions: v.optional(v.string()),
  })),
  knowledgePackIds: v.array(v.string()),
  customKnowledgeSnippets: v.array(v.string()),
  sessionDefaults: v.object({
    ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
    defaultDurationMinutes: v.number(),
  }),
  version: v.number(),
});
