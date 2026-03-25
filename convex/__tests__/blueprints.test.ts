// convex/__tests__/blueprints.test.ts
import { convexTest } from "convex-test";
import { describe,expect, test } from "vitest";

import { api, internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

describe("blueprints", () => {
  test("create and approve triggers next step", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test", query: "test",
    });
    const _blueprintId = await t.mutation(internal.blueprints.create, {
      sessionId,
      blueprint: { title: "Test App", therapyGoal: "Turn-taking" },
      markdownPreview: "# Test App\nGoal: Turn-taking",
    });
    const bp = await t.query(api.blueprints.getBySession, { sessionId });
    expect(bp?.approved).toBe(false);
    expect(bp?.version).toBe(1);

    await t.mutation(api.blueprints.approve, { sessionId });
    const approved = await t.query(api.blueprints.getBySession, { sessionId });
    expect(approved?.approved).toBe(true);
  });
});
