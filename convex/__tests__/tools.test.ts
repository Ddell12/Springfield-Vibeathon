import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

describe("tools CRUD", () => {
  test("tools.create generates a share slug of length 10", async () => {
    const t = convexTest(schema, modules);

    const toolId = await t.mutation(api.tools.create, {
      title: "Visual Schedule",
      description: "A visual schedule for morning routine",
      toolType: "visual-schedule",
      config: { steps: ["wake up", "brush teeth"] },
    });

    const tool = await t.query(api.tools.get, { toolId });
    expect(tool).not.toBeNull();
    expect(tool!.shareSlug).toHaveLength(10);
  });

  test("tools.get returns the created tool", async () => {
    const t = convexTest(schema, modules);

    const toolId = await t.mutation(api.tools.create, {
      title: "Token Board",
      description: "A token reward board",
      toolType: "token-board",
      config: { maxTokens: 5 },
    });

    const tool = await t.query(api.tools.get, { toolId });
    expect(tool).not.toBeNull();
    expect(tool!._id).toEqual(toolId);
    expect(tool!.title).toBe("Token Board");
    expect(tool!.toolType).toBe("token-board");
    expect(tool!.isTemplate).toBe(false);
  });

  test("tools.getBySlug finds tool by share slug", async () => {
    const t = convexTest(schema, modules);

    const toolId = await t.mutation(api.tools.create, {
      title: "Communication Board",
      description: "A simple communication board",
      toolType: "communication-board",
      config: { symbols: ["yes", "no", "help"] },
    });

    const created = await t.query(api.tools.get, { toolId });
    expect(created).not.toBeNull();

    const found = await t.query(api.tools.getBySlug, {
      slug: created!.shareSlug,
    });
    expect(found).not.toBeNull();
    expect(found!._id).toEqual(toolId);
  });

  test("tools.list returns tools sorted by createdAt desc", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.tools.create, {
      title: "First Tool",
      description: "Created first",
      toolType: "choice-board",
      config: {},
    });

    // Small delay to ensure different createdAt timestamps
    await new Promise((resolve) => setTimeout(resolve, 5));

    await t.mutation(api.tools.create, {
      title: "Second Tool",
      description: "Created second",
      toolType: "first-then-board",
      config: {},
    });

    const tools = await t.query(api.tools.list, {});
    expect(tools.length).toBe(2);
    // Most recent first
    expect(tools[0].title).toBe("Second Tool");
    expect(tools[1].title).toBe("First Tool");
    expect(tools[0].createdAt).toBeGreaterThanOrEqual(tools[1].createdAt);
  });

  test("tools.update patches config and updates updatedAt", async () => {
    const t = convexTest(schema, modules);

    const toolId = await t.mutation(api.tools.create, {
      title: "Visual Schedule",
      description: "A visual schedule",
      toolType: "visual-schedule",
      config: { steps: ["wake up"] },
    });

    const original = await t.query(api.tools.get, { toolId });
    expect(original).not.toBeNull();

    // Ensure time advances
    await new Promise((resolve) => setTimeout(resolve, 5));

    await t.mutation(api.tools.update, {
      toolId,
      config: { steps: ["wake up", "get dressed", "eat breakfast"] },
      title: "Updated Visual Schedule",
    });

    const updated = await t.query(api.tools.get, { toolId });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe("Updated Visual Schedule");
    expect(updated!.config.steps).toHaveLength(3);
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(original!.updatedAt);
  });

  test("tools.remove deletes the tool", async () => {
    const t = convexTest(schema, modules);

    const toolId = await t.mutation(api.tools.create, {
      title: "Tool to Delete",
      description: "Will be removed",
      toolType: "token-board",
      config: {},
    });

    const before = await t.query(api.tools.get, { toolId });
    expect(before).not.toBeNull();

    await t.mutation(api.tools.remove, { toolId });

    const after = await t.query(api.tools.get, { toolId });
    expect(after).toBeNull();
  });
});
