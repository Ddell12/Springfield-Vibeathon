// convex/__tests__/sessions.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s"); // REQUIRED for convex-test

describe("sessions — streaming builder mutations", () => {
  it("create returns session in idle state with query stored", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.sessions.create, {
      title: "Token Board App",
      query: "Build a token board for rewarding good behavior",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session).not.toBeNull();
    expect(session?.state).toBe("idle");
    expect(session?.query).toBe("Build a token board for rewarding good behavior");
    expect(session?.title).toBe("Token Board App");
  });

  it("startGeneration transitions state to 'generating'", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.sessions.startGeneration, { sessionId: id });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("generating");
  });

  it("setLive only requires sessionId and sets state to 'live'", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    // After WebContainer refactor: setLive takes only sessionId
    // previewUrl and sandboxId are no longer server-side concerns
    await t.mutation(api.sessions.setLive, {
      sessionId: id,
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("live");
  });

  it("setLive does not require sandboxId or previewUrl", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    // Must not throw when called with only sessionId
    await expect(
      t.mutation(api.sessions.setLive, { sessionId: id })
    ).resolves.not.toThrow();
  });

  it("setFailed stores error message and sets state to 'failed'", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.sessions.setFailed, {
      sessionId: id,
      error: "Claude API returned 529",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("failed");
    expect(session?.error).toBe("Claude API returned 529");
  });

  it("setBlueprint stores blueprint data on session", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    const blueprint = {
      title: "Token Reward Board",
      therapyGoal: "Positive reinforcement for turn-taking",
      targetUser: "ABA therapy, ages 4-8",
      components: ["TokenBoard", "CelebrationOverlay"],
    };
    await t.mutation(api.sessions.setBlueprint, {
      sessionId: id,
      blueprint,
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.blueprint).toEqual(blueprint);
  });

  it("get returns full session object", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.sessions.create, {
      title: "Communication Board",
      query: "A picture communication board",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?._id).toBe(id);
    expect(session?.title).toBe("Communication Board");
    expect(session?.query).toBe("A picture communication board");
  });

  it("list returns sessions ordered descending", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.sessions.create, { title: "First", query: "first" });
    await t.mutation(api.sessions.create, { title: "Second", query: "second" });
    await t.mutation(api.sessions.create, { title: "Third", query: "third" });
    const sessions = await t.query(api.sessions.list, {});
    expect(sessions.length).toBeGreaterThanOrEqual(3);
    // Most recently created should be first
    expect(sessions[0].title).toBe("Third");
  });

  it("state transitions are idempotent — re-setting same state is safe", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.sessions.startGeneration, { sessionId: id });
    await t.mutation(api.sessions.startGeneration, { sessionId: id });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("generating");
  });

  describe("getMostRecent", () => {
    it("returns null when no live sessions exist", async () => {
      const t = convexTest(schema, modules);
      const result = await t.query(api.sessions.getMostRecent, {});
      expect(result).toBeNull();
    });

    it("returns null when sessions exist but none are live", async () => {
      const t = convexTest(schema, modules);
      const id = await t.mutation(api.sessions.create, {
        title: "Idle Session",
        query: "test",
      });
      await t.mutation(api.sessions.startGeneration, { sessionId: id });
      const result = await t.query(api.sessions.getMostRecent, {});
      expect(result).toBeNull();
    });

    it("returns the live session when one exists", async () => {
      const t = convexTest(schema, modules);
      const id = await t.mutation(api.sessions.create, {
        title: "Live App",
        query: "Build a token board",
      });
      await t.mutation(api.sessions.setLive, { sessionId: id });
      const result = await t.query(api.sessions.getMostRecent, {});
      expect(result).not.toBeNull();
      expect(result?._id).toBe(id);
      expect(result?.state).toBe("live");
      expect(result?.title).toBe("Live App");
    });

    it("returns the most recently created live session when multiple exist", async () => {
      const t = convexTest(schema, modules);
      const id1 = await t.mutation(api.sessions.create, {
        title: "First Live",
        query: "first",
      });
      await t.mutation(api.sessions.setLive, { sessionId: id1 });
      const id2 = await t.mutation(api.sessions.create, {
        title: "Second Live",
        query: "second",
      });
      await t.mutation(api.sessions.setLive, { sessionId: id2 });
      const result = await t.query(api.sessions.getMostRecent, {});
      expect(result?._id).toBe(id2);
      expect(result?.title).toBe("Second Live");
    });

    it("does not return failed or generating sessions", async () => {
      const t = convexTest(schema, modules);
      const idFailed = await t.mutation(api.sessions.create, {
        title: "Failed Session",
        query: "failed",
      });
      await t.mutation(api.sessions.setFailed, {
        sessionId: idFailed,
        error: "Something went wrong",
      });
      const idGenerating = await t.mutation(api.sessions.create, {
        title: "Generating Session",
        query: "generating",
      });
      await t.mutation(api.sessions.startGeneration, {
        sessionId: idGenerating,
      });
      const result = await t.query(api.sessions.getMostRecent, {});
      expect(result).toBeNull();
    });
  });
});
