// convex/__tests__/sessions.test.ts
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

describe("sessions", () => {
  test("create session with idle state", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.sessions.create, {
      title: "Test App",
      query: "Build a token board",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("idle");
    expect(session?.phasesRemaining).toBe(8);
    expect(session?.mvpGenerated).toBe(false);
  });

  test("updateState transitions and auto-schedules", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.sessions.create, {
      title: "Test", query: "test",
    });
    await t.mutation(internal.sessions.updateState, {
      sessionId: id, state: "phase_generating", stateMessage: "Planning phase 1",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("phase_generating");
  });

  test("setFailed captures reason and last good state", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.sessions.create, {
      title: "Test", query: "test",
    });
    await t.mutation(internal.sessions.updateState, {
      sessionId: id, state: "phase_implementing", stateMessage: "Generating files",
    });
    await t.mutation(internal.sessions.setFailed, {
      sessionId: id, reason: "LLM timeout",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("failed");
    expect(session?.failureReason).toBe("LLM timeout");
    expect(session?.lastGoodState).toBe("phase_implementing");
  });
});
