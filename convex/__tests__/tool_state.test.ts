import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

describe("toolState CRUD", () => {
  test("get returns null for a non-existent key", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.tool_state.get, {
      projectId: "project-abc" as unknown as import("convex/values").GenericId<"projects">,
      key: "tokenCount",
    });

    expect(result).toBeNull();
  });

  test("set creates a new state entry", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "Token Board",
    });

    await t.mutation(api.tool_state.set, {
      projectId,
      key: "tokenCount",
      value: 5,
    });

    const result = await t.query(api.tool_state.get, {
      projectId,
      key: "tokenCount",
    });

    expect(result).not.toBeNull();
    expect(result!.value).toBe(5);
  });

  test("set updates an existing entry (upsert behavior)", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "Token Board",
    });

    // First set
    await t.mutation(api.tool_state.set, {
      projectId,
      key: "tokenCount",
      value: 3,
    });

    // Second set — should overwrite
    await t.mutation(api.tool_state.set, {
      projectId,
      key: "tokenCount",
      value: 7,
    });

    const result = await t.query(api.tool_state.get, {
      projectId,
      key: "tokenCount",
    });

    expect(result!.value).toBe(7);
  });

  test("different keys are independent entries", async () => {
    const t = convexTest(schema, modules);

    const projectId = await t.mutation(api.projects.create, {
      title: "Communication Board",
    });

    await t.mutation(api.tool_state.set, {
      projectId,
      key: "selectedCard",
      value: "cat",
    });

    await t.mutation(api.tool_state.set, {
      projectId,
      key: "volume",
      value: 80,
    });

    const card = await t.query(api.tool_state.get, { projectId, key: "selectedCard" });
    const volume = await t.query(api.tool_state.get, { projectId, key: "volume" });

    expect(card!.value).toBe("cat");
    expect(volume!.value).toBe(80);
  });

  test("state is scoped to projectId — different projects don't share state", async () => {
    const t = convexTest(schema, modules);

    const projectA = await t.mutation(api.projects.create, { title: "Project A" });
    const projectB = await t.mutation(api.projects.create, { title: "Project B" });

    await t.mutation(api.tool_state.set, {
      projectId: projectA,
      key: "score",
      value: 10,
    });

    const resultB = await t.query(api.tool_state.get, {
      projectId: projectB,
      key: "score",
    });

    expect(resultB).toBeNull();
  });
});
