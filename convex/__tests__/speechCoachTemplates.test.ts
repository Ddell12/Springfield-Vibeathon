import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

describe("speech coach template schema", () => {
  it("includes speechCoachTemplates and template-aware home program config", () => {
    expect(schema.tables).toHaveProperty("speechCoachTemplates");
    const homePrograms = schema.tables.homePrograms.validator;
    expect(homePrograms).toBeTruthy();
  });
});

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "https://test.convex.dev" };

describe("speechCoachTemplates CRUD", () => {
  it("seeds system templates and lists them ahead of custom templates", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.speechCoachTemplates.ensureSystemTemplates, {});
    const templateId = await slp.mutation(api.speechCoachTemplates.create, {
      template: {
        name: "Articulation Warmup",
        description: "Short playful articulation practice",
        status: "active",
        voice: { provider: "elevenlabs", voiceKey: "friendly-coach" },
        prompt: {},
        tools: [],
        skills: [],
        knowledgePackIds: [],
        customKnowledgeSnippets: [],
        sessionDefaults: { ageRange: "5-7", defaultDurationMinutes: 5 },
        version: 1,
      },
    });

    const templates = await slp.query(api.speechCoachTemplates.listMine, {});

    expect(templates[0]?.isSystemTemplate).toBe(true);
    expect(templates.some((template) => template._id === templateId)).toBe(true);
    expect(templates.filter((template) => template.isSystemTemplate).length).toBe(4);
  });

  it("allows an SLP to create and list their speech coach templates", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const templateId = await slp.mutation(api.speechCoachTemplates.create, {
      template: {
        name: "Articulation Warmup",
        description: "Short playful articulation practice",
        status: "active",
        voice: { provider: "elevenlabs", voiceKey: "friendly-coach" },
        prompt: {},
        tools: [],
        skills: [],
        knowledgePackIds: [],
        customKnowledgeSnippets: [],
        sessionDefaults: { ageRange: "5-7", defaultDurationMinutes: 5 },
        version: 1,
      },
    });

    const templates = await slp.query(api.speechCoachTemplates.listMine, {});
    expect(templates.map((t) => t._id)).toContain(templateId);
  });

  it("duplicates an existing speech coach template", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const templateId = await slp.mutation(api.speechCoachTemplates.create, {
      template: {
        name: "Articulation Warmup",
        description: "Short playful articulation practice",
        status: "active",
        voice: { provider: "elevenlabs", voiceKey: "friendly-coach" },
        prompt: {},
        tools: [],
        skills: [],
        knowledgePackIds: [],
        customKnowledgeSnippets: [],
        sessionDefaults: { ageRange: "5-7", defaultDurationMinutes: 5 },
        version: 1,
      },
    });

    const copyId = await slp.mutation(api.speechCoachTemplates.duplicate, {
      templateId,
    });

    const templates = await slp.query(api.speechCoachTemplates.listMine, {});
    const copy = templates.find((template) => template._id === copyId);

    expect(copy?.name).toBe("Articulation Warmup (copy)");
  });

  it("blocks direct edits to system templates", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.speechCoachTemplates.ensureSystemTemplates, {});
    const templates = await slp.query(api.speechCoachTemplates.listMine, {});
    const systemTemplate = templates.find((template) => template.isSystemTemplate);

    await expect(
      slp.mutation(api.speechCoachTemplates.update, {
        templateId: systemTemplate!._id,
        template: {
          name: "Updated",
          description: "desc",
          status: "active",
          voice: { provider: "elevenlabs", voiceKey: "friendly-coach" },
          prompt: {},
          tools: [],
          skills: [],
          knowledgePackIds: [],
          customKnowledgeSnippets: [],
          sessionDefaults: { ageRange: "5-7", defaultDurationMinutes: 5 },
          version: 1,
        },
      })
    ).rejects.toThrow(/duplicate first/i);
  });
});
