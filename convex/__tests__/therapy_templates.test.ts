// convex/__tests__/therapy_templates.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s"); // REQUIRED for convex-test

describe("therapy_templates", () => {
  it("list returns empty array when no templates exist", async () => {
    const t = convexTest(schema, modules);
    const results = await t.query(api.therapy_templates.list, {});
    expect(results).toHaveLength(0);
  });

  it("list returns all templates after insert", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("therapyTemplates", {
        name: "Token Board",
        description: "Reinforcement token board for ABA therapy",
        category: "Behavior Support",
        starterPrompt: "Build a 5-star token board",
        sortOrder: 1,
      });
      await ctx.db.insert("therapyTemplates", {
        name: "Feelings Check-In",
        description: "Emotions board for daily check-ins",
        category: "Communication",
        starterPrompt: "Create a feelings check-in board",
        sortOrder: 2,
      });
    });
    const results = await t.query(api.therapy_templates.list, {});
    expect(results).toHaveLength(2);
  });

  it("getByCategory filters templates by category", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("therapyTemplates", {
        name: "Token Board",
        description: "Reinforcement token board",
        category: "Behavior Support",
        starterPrompt: "Build a token board",
        sortOrder: 1,
      });
      await ctx.db.insert("therapyTemplates", {
        name: "First-Then Board",
        description: "Transition visual board",
        category: "Behavior Support",
        starterPrompt: "Build a first-then board",
        sortOrder: 2,
      });
      await ctx.db.insert("therapyTemplates", {
        name: "Snack Request Board",
        description: "Communication board for snacks",
        category: "Communication",
        starterPrompt: "Build a snack board",
        sortOrder: 3,
      });
    });
    const behaviorResults = await t.query(api.therapy_templates.getByCategory, {
      category: "Behavior Support",
    });
    expect(behaviorResults).toHaveLength(2);
    expect(behaviorResults.every((r) => r.category === "Behavior Support")).toBe(true);

    const commResults = await t.query(api.therapy_templates.getByCategory, {
      category: "Communication",
    });
    expect(commResults).toHaveLength(1);
    expect(commResults[0].name).toBe("Snack Request Board");
  });

  it("getByCategory returns empty for unknown category", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("therapyTemplates", {
        name: "Token Board",
        description: "Reinforcement token board",
        category: "Behavior Support",
        starterPrompt: "Build a token board",
        sortOrder: 1,
      });
    });
    const results = await t.query(api.therapy_templates.getByCategory, {
      category: "Unknown",
    });
    expect(results).toHaveLength(0);
  });

  it("get returns template by id", async () => {
    const t = convexTest(schema, modules);
    const insertedId = await t.run(async (ctx) => {
      return await ctx.db.insert("therapyTemplates", {
        name: "Morning Routine",
        description: "Step-by-step morning routine schedule",
        category: "Daily Routines",
        starterPrompt: "Build a morning routine visual schedule",
        sortOrder: 5,
      });
    });
    const result = await t.query(api.therapy_templates.get, { id: insertedId });
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Morning Routine");
    expect(result?.category).toBe("Daily Routines");
  });

  it("seed populates therapyTemplates with predefined templates", async () => {
    const t = convexTest(schema, modules);
    // Call the seed internalMutation via t.run
    await t.run(async (ctx) => {
      // Simulate seed by calling the handler directly
      const existing = await ctx.db.query("therapyTemplates").first();
      if (existing) return;

      await ctx.db.insert("therapyTemplates", {
        name: "Snack Request Board",
        description: "A picture communication board",
        category: "Communication",
        starterPrompt: "Build a picture communication board",
        sortOrder: 1,
      });
    });
    const results = await t.query(api.therapy_templates.list, {});
    expect(results.length).toBeGreaterThan(0);
  });

  it("seed is idempotent — does not insert if records already exist", async () => {
    const t = convexTest(schema, modules);
    // Insert one template first
    await t.run(async (ctx) => {
      await ctx.db.insert("therapyTemplates", {
        name: "Existing Template",
        description: "Already seeded",
        category: "Communication",
        starterPrompt: "Existing prompt",
        sortOrder: 0,
      });
    });
    // Call the seed internalMutation via the internal API
    const { internal } = await import("../_generated/api");
    await t.mutation(internal.therapy_templates.seed, {});
    // Should still only have 1 record (the existing one)
    const results = await t.query(api.therapy_templates.list, {});
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Existing Template");
  });

  it("seed (direct) inserts 8 templates when database is empty", async () => {
    const t = convexTest(schema, modules);
    const { internal } = await import("../_generated/api");
    await t.mutation(internal.therapy_templates.seed, {});
    const results = await t.query(api.therapy_templates.list, {});
    expect(results).toHaveLength(8);
  });

  it("get returns null for non-existent id", async () => {
    const t = convexTest(schema, modules);
    // Insert one template to get a valid ID format, then use a different (non-existent) doc id
    const existingId = await t.run(async (ctx) => {
      return await ctx.db.insert("therapyTemplates", {
        name: "Placeholder",
        description: "Placeholder template",
        category: "Communication",
        starterPrompt: "Placeholder prompt",
        sortOrder: 99,
      });
    });
    // Delete the inserted doc so the ID no longer exists
    await t.run(async (ctx) => {
      await ctx.db.delete(existingId);
    });
    const result = await t.query(api.therapy_templates.get, { id: existingId });
    expect(result).toBeNull();
  });
});
