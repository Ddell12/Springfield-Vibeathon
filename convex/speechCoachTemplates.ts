import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";
import { slpMutation, slpQuery } from "./lib/customFunctions";
import { speechCoachTemplateValidator } from "./lib/speechCoachValidators";

const SYSTEM_TEMPLATE_SEEDS = [
  {
    name: "Sound Drill",
    description:
      "Structured repetition with clear cues. Best for early articulation targets and imitation practice.",
    status: "active" as const,
    voice: { provider: "elevenlabs" as const, voiceKey: "friendly-coach" },
    prompt: {},
    tools: [],
    skills: [
      { key: "model-then-imitate" as const, enabled: true },
      { key: "recast-and-retry" as const, enabled: true },
      { key: "low-frustration-fallback" as const, enabled: true },
    ],
    knowledgePackIds: [],
    customKnowledgeSnippets: [],
    sessionDefaults: { ageRange: "5-7" as const, defaultDurationMinutes: 10 },
    version: 1,
  },
  {
    name: "Conversational",
    description:
      "Warm, topic-based practice using the child's interests. Good for carryover and generalization.",
    status: "active" as const,
    voice: { provider: "elevenlabs" as const, voiceKey: "friendly-coach" },
    prompt: {},
    tools: [],
    skills: [
      { key: "carryover-conversation" as const, enabled: true },
      { key: "choice-based-elicitation" as const, enabled: true },
      { key: "low-frustration-fallback" as const, enabled: true },
    ],
    knowledgePackIds: [],
    customKnowledgeSnippets: [],
    sessionDefaults: { ageRange: "5-7" as const, defaultDurationMinutes: 10 },
    version: 1,
  },
  {
    name: "Listening First",
    description:
      "Ear training before speaking. Coach models target sounds repeatedly before asking the child to try.",
    status: "active" as const,
    voice: { provider: "elevenlabs" as const, voiceKey: "friendly-coach" },
    prompt: {},
    tools: [],
    skills: [
      { key: "auditory-bombardment" as const, enabled: true },
      { key: "model-then-imitate" as const, enabled: true },
      { key: "low-frustration-fallback" as const, enabled: true },
    ],
    knowledgePackIds: [],
    customKnowledgeSnippets: [],
    sessionDefaults: { ageRange: "2-4" as const, defaultDurationMinutes: 5 },
    version: 1,
  },
  {
    name: "Mixed Practice",
    description:
      "Alternates drills and natural conversation. Builds accuracy then moves to real-world use.",
    status: "active" as const,
    voice: { provider: "elevenlabs" as const, voiceKey: "friendly-coach" },
    prompt: {},
    tools: [],
    skills: [
      { key: "model-then-imitate" as const, enabled: true },
      { key: "recast-and-retry" as const, enabled: true },
      { key: "carryover-conversation" as const, enabled: true },
      { key: "low-frustration-fallback" as const, enabled: true },
    ],
    knowledgePackIds: [],
    customKnowledgeSnippets: [],
    sessionDefaults: { ageRange: "5-7" as const, defaultDurationMinutes: 10 },
    version: 1,
  },
];

export const seedSystemTemplates = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("speechCoachTemplates")
      .withIndex("by_isSystemTemplate", (q) => q.eq("isSystemTemplate", true))
      .first();

    if (existing) return;

    const now = Date.now();
    for (const template of SYSTEM_TEMPLATE_SEEDS) {
      await ctx.db.insert("speechCoachTemplates", {
        ...template,
        slpUserId: "system",
        isSystemTemplate: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const ensureSystemTemplates = slpMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("speechCoachTemplates")
      .withIndex("by_isSystemTemplate", (q) => q.eq("isSystemTemplate", true))
      .first();

    if (existing) return null;

    const now = Date.now();
    for (const template of SYSTEM_TEMPLATE_SEEDS) {
      await ctx.db.insert("speechCoachTemplates", {
        ...template,
        slpUserId: "system",
        isSystemTemplate: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return null;
  },
});

export const listMine = slpQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.slpUserId) return [];
    const [mine, system] = await Promise.all([
      ctx.db
        .query("speechCoachTemplates")
        .withIndex("by_slpUserId_updatedAt", (q) =>
          q.eq("slpUserId", ctx.slpUserId!)
        )
        .order("desc")
        .take(100),
      ctx.db
        .query("speechCoachTemplates")
        .withIndex("by_isSystemTemplate", (q) => q.eq("isSystemTemplate", true))
        .take(20),
    ]);

    return [...system, ...mine];
  },
});

export const create = slpMutation({
  args: { template: speechCoachTemplateValidator },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("speechCoachTemplates", {
      ...args.template,
      slpUserId: ctx.slpUserId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getById = slpQuery({
  args: { templateId: v.id("speechCoachTemplates") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) return null;
    const template = await ctx.db.get(args.templateId);
    if (
      !template ||
      (!template.isSystemTemplate && template.slpUserId !== ctx.slpUserId)
    ) {
      return null;
    }
    return template;
  },
});

export const getByIdInternal = internalQuery({
  args: { templateId: v.id("speechCoachTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

export const update = slpMutation({
  args: {
    templateId: v.id("speechCoachTemplates"),
    template: speechCoachTemplateValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.templateId);
    if (existing?.isSystemTemplate) {
      throw new ConvexError("System templates cannot be edited — duplicate first");
    }
    if (!existing || existing.slpUserId !== ctx.slpUserId) {
      throw new ConvexError("Template not found");
    }

    await ctx.db.patch(args.templateId, {
      ...args.template,
      updatedAt: Date.now(),
    });
  },
});

export const duplicate = slpMutation({
  args: { templateId: v.id("speechCoachTemplates") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.templateId);
    if (!existing) {
      throw new ConvexError("Template not found");
    }

    const now = Date.now();
    const {
      _id: _templateId,
      _creationTime: _createdAt,
      slpUserId: _ownerId,
      isSystemTemplate: _isSystemTemplate,
      createdAt: _recordCreatedAt,
      updatedAt: _recordUpdatedAt,
      ...fields
    } = existing;

    return await ctx.db.insert("speechCoachTemplates", {
      ...fields,
      name: `${fields.name} (copy)`,
      slpUserId: ctx.slpUserId,
      createdAt: now,
      updatedAt: now,
    });
  },
});
