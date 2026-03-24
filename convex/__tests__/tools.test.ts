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

  test("tools.getByThread returns empty array for unknown threadId", async () => {
    const t = convexTest(schema, modules);

    const tools = await t.query(api.tools.getByThread, {
      threadId: "nonexistent-thread-id",
    });
    expect(tools).toEqual([]);
  });

  test("tools.getByThread returns tools matching the threadId", async () => {
    const t = convexTest(schema, modules);

    const threadId = "thread-abc-123";

    await t.mutation(api.tools.create, {
      title: "Schedule A",
      description: "First tool in thread",
      toolType: "visual-schedule",
      config: { steps: ["step 1"] },
      threadId,
    });

    await t.mutation(api.tools.create, {
      title: "Board B",
      description: "Second tool in thread",
      toolType: "token-board",
      config: { maxTokens: 3 },
      threadId,
    });

    const tools = await t.query(api.tools.getByThread, { threadId });
    expect(tools).toHaveLength(2);
    expect(tools.map((t: any) => t.title).sort()).toEqual([
      "Board B",
      "Schedule A",
    ]);
    tools.forEach((tool: any) => {
      expect(tool.threadId).toBe(threadId);
    });
  });

  test("tools.getByThread excludes tools from other threads", async () => {
    const t = convexTest(schema, modules);

    const threadA = "thread-aaa";
    const threadB = "thread-bbb";

    await t.mutation(api.tools.create, {
      title: "Tool in Thread A",
      description: "Belongs to thread A",
      toolType: "choice-board",
      config: {},
      threadId: threadA,
    });

    await t.mutation(api.tools.create, {
      title: "Tool in Thread B",
      description: "Belongs to thread B",
      toolType: "first-then-board",
      config: {},
      threadId: threadB,
    });

    const toolsA = await t.query(api.tools.getByThread, { threadId: threadA });
    expect(toolsA).toHaveLength(1);
    expect(toolsA[0].title).toBe("Tool in Thread A");

    const toolsB = await t.query(api.tools.getByThread, { threadId: threadB });
    expect(toolsB).toHaveLength(1);
    expect(toolsB[0].title).toBe("Tool in Thread B");
  });

  test("tools.create with isTemplate: true stores the flag correctly", async () => {
    const t = convexTest(schema, modules);

    const toolId = await t.mutation(api.tools.create, {
      title: "Morning Routine Template",
      description: "A reusable template for morning routines",
      toolType: "visual-schedule",
      config: { steps: ["wake up", "brush teeth", "get dressed"] },
      isTemplate: true,
    });

    const tool = await t.query(api.tools.get, { toolId });
    expect(tool).not.toBeNull();
    expect(tool!.isTemplate).toBe(true);
    expect(tool!.title).toBe("Morning Routine Template");
  });
});
