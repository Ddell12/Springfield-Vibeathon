/**
 * Tests for convex/templates/ — seed and list operations.
 *
 * These tests run against convex-test's mock runtime and exercise both the
 * seedTemplates internalMutation and the listTemplates public query.
 */

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api, internal } from "../_generated/api";
import schema from "../schema";

// Auto-import all convex modules so the mock runtime can resolve function refs
const modules = import.meta.glob("../**/*.*s");

describe("templates seed", () => {
  test("seedTemplates inserts 6 templates", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.templates.seed.seedTemplates, {});

    const templates = await t.query(api.templates.queries.listTemplates, {});
    expect(templates).toHaveLength(6);
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
      expect(tpl.category).toBe("communication");
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
      expect(tpl.category).toBe("rewards");
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
      expect(tpl.category).toBe("routines");
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
      expect(typeof tpl.name).toBe("string");
      expect(tpl.name.length).toBeGreaterThan(0);
      expect(typeof tpl.starterPrompt).toBe("string");
      expect(tpl.starterPrompt.length).toBeGreaterThan(0);
      expect(typeof tpl.category).toBe("string");
      expect(typeof tpl.sortOrder).toBe("number");
    }
  });
});
