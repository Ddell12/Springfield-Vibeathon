/**
 * Tests for convex/templates/ — seed and list operations.
 *
 * These tests run against convex-test's mock runtime and exercise both the
 * seedTemplates internalMutation and the listTemplates public query.
 *
 * NOTE: The vitest config must include "convex/**\/*.test.ts" in its `include`
 * array for these tests to run. See ai.test.ts for the same note.
 */

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api, internal } from "../_generated/api";
import schema from "../schema";

// Auto-import all convex modules so the mock runtime can resolve function refs
const modules = import.meta.glob("../**/*.*s");

describe("templates seed", () => {
  test("seedTemplates inserts 6 tools with isTemplate=true", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.templates.seed.seedTemplates, {});

    const templates = await t.query(api.templates.queries.listTemplates, {});
    expect(templates).toHaveLength(6);
    for (const tpl of templates) {
      expect(tpl.isTemplate).toBe(true);
    }
  });

  test("seedTemplates is idempotent — running twice does not create duplicates", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.templates.seed.seedTemplates, {});
    await t.mutation(internal.templates.seed.seedTemplates, {});

    const templates = await t.query(api.templates.queries.listTemplates, {});
    expect(templates).toHaveLength(6);
  });
});

describe("listTemplates", () => {
  test("listTemplates with no category returns all templates", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.templates.seed.seedTemplates, {});

    const templates = await t.query(api.templates.queries.listTemplates, {});
    expect(templates).toHaveLength(6);
  });

  test("listTemplates filters by communication category", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.templates.seed.seedTemplates, {});

    const templates = await t.query(api.templates.queries.listTemplates, {
      category: "communication",
    });
    expect(templates).toHaveLength(2);
    for (const tpl of templates) {
      expect(tpl.toolType).toBe("communication-board");
    }
  });

  test("listTemplates filters by rewards category", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.templates.seed.seedTemplates, {});

    const templates = await t.query(api.templates.queries.listTemplates, {
      category: "rewards",
    });
    expect(templates).toHaveLength(2);
    for (const tpl of templates) {
      expect(tpl.toolType).toBe("token-board");
    }
  });

  test("listTemplates filters by routines category", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.templates.seed.seedTemplates, {});

    const templates = await t.query(api.templates.queries.listTemplates, {
      category: "routines",
    });
    expect(templates).toHaveLength(2);
    for (const tpl of templates) {
      expect(tpl.toolType).toBe("visual-schedule");
    }
  });

  test("listTemplates returns empty array when no templates seeded", async () => {
    const t = convexTest(schema, modules);

    const templates = await t.query(api.templates.queries.listTemplates, {});
    expect(templates).toEqual([]);
  });

  test("template records have correct shape", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.templates.seed.seedTemplates, {});

    const templates = await t.query(api.templates.queries.listTemplates, {});
    expect(templates.length).toBeGreaterThan(0);

    for (const tpl of templates) {
      expect(tpl.isTemplate).toBe(true);
      expect(tpl.templateCategory).toBeTruthy();
      expect(typeof tpl.shareSlug).toBe("string");
      expect(tpl.shareSlug.length).toBeGreaterThan(0);
      expect(tpl.config).not.toBeNull();
    }
  });
});
