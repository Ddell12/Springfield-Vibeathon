// convex/__tests__/schema.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s"); // REQUIRED for convex-test

describe("schema — streaming builder contract", () => {
  it("sessions table exists with 4-state union", async () => {
    const t = convexTest(schema, modules);
    // If the union is wrong the insert will throw at runtime
    const id = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "Build a token board",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session).not.toBeNull();
    expect(session?.state).toBe("idle");
  });

  it("sessions state accepts 'generating'", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.sessions.startGeneration, { sessionId: id });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("generating");
  });

  it("sessions state accepts 'live'", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.sessions.setLive, { sessionId: id });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("live");
  });

  it("sessions state accepts 'failed'", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.sessions.setFailed, {
      sessionId: id,
      error: "LLM timeout",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("failed");
  });

  it("no phases table — phases table removed in streaming builder", () => {
    expect(schema.tables).not.toHaveProperty("phases");
  });

  it("no agentContext table — agentContext table removed in streaming builder", () => {
    expect(schema.tables).not.toHaveProperty("agentContext");
  });

  it("no versions table — versions table removed in streaming builder", () => {
    expect(schema.tables).not.toHaveProperty("versions");
  });

  it("no blueprints table — blueprints table removed in streaming builder", () => {
    expect(schema.tables).not.toHaveProperty("blueprints");
  });

  it("generated_files table exists with version field", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.generated_files.upsert, {
      sessionId,
      path: "src/App.tsx",
      contents: "export default function App() { return <div />; }",
      version: 1,
    });
    const file = await t.query(api.generated_files.getByPath, {
      sessionId,
      path: "src/App.tsx",
    });
    expect(file).not.toBeNull();
    expect(file?.version).toBe(1);
  });
});
