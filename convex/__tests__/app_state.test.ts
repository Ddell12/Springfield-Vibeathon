// convex/__tests__/app_state.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = {
  subject: "slp-user-123",
  issuer: "https://test.convex.dev",
};

async function createAppInstance(t: ReturnType<typeof convexTest>) {
  return t.withIdentity(SLP_IDENTITY).mutation(api.tools.create, {
    templateType: "aac_board",
    title: "Test App",
    configJson: JSON.stringify({ title: "Test App" }),
  });
}

describe("app_state", () => {
  it("set and get round-trip works with a valid app instance ID", async () => {
    const t = convexTest(schema, modules);
    const appId = await createAppInstance(t);
    await t.mutation(api.app_state.set, { appId, key: "score", value: 42 });
    const result = await t.query(api.app_state.get, { appId, key: "score" });
    expect(result?.value).toBe(42);
  });

  it("get returns null for missing key", async () => {
    const t = convexTest(schema, modules);
    const appId = await createAppInstance(t);
    const result = await t.query(api.app_state.get, { appId, key: "missing" });
    expect(result).toBeNull();
  });

  it("set upserts existing state", async () => {
    const t = convexTest(schema, modules);
    const appId = await createAppInstance(t);
    await t.mutation(api.app_state.set, { appId, key: "score", value: 42 });
    await t.mutation(api.app_state.set, { appId, key: "score", value: 99 });
    const result = await t.query(api.app_state.get, { appId, key: "score" });
    expect(result?.value).toBe(99);
  });

  it("getAll returns all states for appId", async () => {
    const t = convexTest(schema, modules);
    const appId = await createAppInstance(t);
    await t.mutation(api.app_state.set, { appId, key: "a", value: 1 });
    await t.mutation(api.app_state.set, { appId, key: "b", value: 2 });
    const results = await t.query(api.app_state.getAll, { appId });
    expect(results).toHaveLength(2);
  });

  it("set throws when appId does not reference a known app_instances document", async () => {
    const t = convexTest(schema, modules);
    const appId = await createAppInstance(t);
    // Delete the app instance to simulate an orphaned reference
    await t.run(async (ctx) => {
      await ctx.db.delete(appId);
    });
    await expect(
      t.mutation(api.app_state.set, { appId, key: "score", value: 1 })
    ).rejects.toThrow("Unknown app");
  });
});
