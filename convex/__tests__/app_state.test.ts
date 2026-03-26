// convex/__tests__/app_state.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s"); // REQUIRED for convex-test

describe("app_state", () => {
  it("get returns null for missing key", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.app_state.get, { appId: "app1", key: "missing" });
    expect(result).toBeNull();
  });

  it("set inserts new state", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.app_state.set, { appId: "app1", key: "score", value: 42 });
    const result = await t.query(api.app_state.get, { appId: "app1", key: "score" });
    expect(result?.value).toBe(42);
  });

  it("set upserts existing state", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.app_state.set, { appId: "app1", key: "score", value: 42 });
    await t.mutation(api.app_state.set, { appId: "app1", key: "score", value: 99 });
    const result = await t.query(api.app_state.get, { appId: "app1", key: "score" });
    expect(result?.value).toBe(99);
  });

  it("getAll returns all states for appId", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.app_state.set, { appId: "app1", key: "a", value: 1 });
    await t.mutation(api.app_state.set, { appId: "app1", key: "b", value: 2 });
    await t.mutation(api.app_state.set, { appId: "other", key: "c", value: 3 });
    const results = await t.query(api.app_state.getAll, { appId: "app1" });
    expect(results).toHaveLength(2);
  });

  it("getAll returns empty for unknown appId", async () => {
    const t = convexTest(schema, modules);
    const results = await t.query(api.app_state.getAll, { appId: "unknown" });
    expect(results).toHaveLength(0);
  });
});
