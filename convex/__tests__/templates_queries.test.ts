// convex/__tests__/templates_queries.test.ts
// Tests for convex/templates/queries.ts — listTemplates public query
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s"); // REQUIRED for convex-test

describe("templates/queries — listTemplates", () => {
  it("returns empty array when no templates exist", async () => {
    const t = convexTest(schema, modules);
    const results = await t.query(api.templates.queries.listTemplates, {});
    expect(results).toHaveLength(0);
  });

  it("returns all templates when no category filter is specified", async () => {
    const t = convexTest(schema, modules);
    // Seed two templates with different categories
    await t.run(async (ctx) => {
      await ctx.db.insert("therapyTemplates", {
        name: "Token Board",
        description: "A behavior support token board",
        category: "Behavior Support",
        starterPrompt: "Build a token board",
        sortOrder: 1,
      });
      await ctx.db.insert("therapyTemplates", {
        name: "Snack Request Board",
        description: "A communication board for snacks",
        category: "Communication",
        starterPrompt: "Build a snack board",
        sortOrder: 2,
      });
    });
    const results = await t.query(api.templates.queries.listTemplates, {});
    expect(results).toHaveLength(2);
  });

  it("filters by category when category is provided", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("therapyTemplates", {
        name: "Token Board",
        description: "A behavior support token board",
        category: "Behavior Support",
        starterPrompt: "Build a token board",
        sortOrder: 1,
      });
      await ctx.db.insert("therapyTemplates", {
        name: "Snack Request Board",
        description: "A communication board for snacks",
        category: "Communication",
        starterPrompt: "Build a snack board",
        sortOrder: 2,
      });
      await ctx.db.insert("therapyTemplates", {
        name: "First-Then Board",
        description: "A transition support board",
        category: "Behavior Support",
        starterPrompt: "Build a first-then board",
        sortOrder: 3,
      });
    });
    const results = await t.query(api.templates.queries.listTemplates, {
      category: "Behavior Support",
    });
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.category === "Behavior Support")).toBe(true);
  });

  it("returns empty array when filtering by non-existent category", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("therapyTemplates", {
        name: "Token Board",
        description: "A behavior support token board",
        category: "Behavior Support",
        starterPrompt: "Build a token board",
        sortOrder: 1,
      });
    });
    const results = await t.query(api.templates.queries.listTemplates, {
      category: "NonExistentCategory",
    });
    expect(results).toHaveLength(0);
  });
});
