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
});
