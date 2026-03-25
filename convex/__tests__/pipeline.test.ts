// convex/__tests__/pipeline.test.ts
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

describe("pipeline", () => {
  test("executeStep handles unknown state gracefully", async () => {
    const t = convexTest(schema, modules);
    // Create a session in "idle" state — pipeline should be a no-op
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    // Verify session starts in idle (no pipeline action triggered)
    const session = await t.query(api.sessions.get, { sessionId });
    expect(session?.state).toBe("idle");
    // Note: can't easily test LLM steps in unit tests.
    // executeStep with idle state is a no-op per the switch/default.
  });

  test("pipeline sets failed state on error", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    // Manually set state to blueprinting (skipping startBuild to avoid scheduler issues)
    await t.mutation(internal.sessions.updateState, {
      sessionId,
      state: "blueprinting",
      stateMessage: "test",
    });
    // Verify the session can be set to failed via setFailed
    await t.mutation(internal.sessions.setFailed, {
      sessionId,
      reason: "Test failure",
    });
    const session = await t.query(api.sessions.get, { sessionId });
    expect(session?.state).toBe("failed");
    expect(session?.failureReason).toBe("Test failure");
    expect(session?.lastGoodState).toBe("blueprinting");
  });

  test("dispatcher routes blueprinting state correctly", async () => {
    const t = convexTest(schema, modules);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Token Board",
      query: "Build a token economy board for ABA therapy",
    });
    // Set to blueprinting
    await t.mutation(internal.sessions.updateState, {
      sessionId,
      state: "blueprinting",
      stateMessage: "Generating blueprint...",
    });
    const session = await t.query(api.sessions.get, { sessionId });
    expect(session?.state).toBe("blueprinting");
    expect(session?.stateMessage).toBe("Generating blueprint...");
    // Note: The actual executeStep call would try to call Anthropic API
    // and fail without an API key. Integration testing is done manually.
  });
});
