// convex/__tests__/sessions.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import { SESSION_STATES } from "../lib/session_states";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s"); // REQUIRED for convex-test

const TEST_IDENTITY = { subject: "test-user-123", issuer: "clerk" };
const OTHER_IDENTITY = { subject: "other-user-456", issuer: "clerk" };

describe("sessions — streaming builder mutations", () => {
  it("create returns session in idle state with query stored", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
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
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const id = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.sessions.startGeneration, { sessionId: id });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("generating");
  });

  it("setLive sets state to 'live' from generating", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const id = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.sessions.startGeneration, { sessionId: id });
    await t.mutation(api.sessions.setLive, {
      sessionId: id,
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("live");
  });

  it("setLive does not require sandboxId or previewUrl", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const id = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.sessions.startGeneration, { sessionId: id });
    // Must not throw when called with only sessionId (from generating state)
    await expect(
      t.mutation(api.sessions.setLive, { sessionId: id })
    ).resolves.not.toThrow();
  });

  it("setFailed stores error message and sets state to 'failed'", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const id = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.sessions.startGeneration, { sessionId: id });
    await t.mutation(api.sessions.setFailed, {
      sessionId: id,
      error: "Claude API returned 529",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("failed");
    expect(session?.error).toBe("Claude API returned 529");
  });

  it("setBlueprint stores blueprint data on session", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
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
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
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
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    await t.mutation(api.sessions.create, { title: "First", query: "first" });
    await t.mutation(api.sessions.create, { title: "Second", query: "second" });
    await t.mutation(api.sessions.create, { title: "Third", query: "third" });
    const sessions = await t.query(api.sessions.list, {});
    expect(sessions.length).toBeGreaterThanOrEqual(3);
    // Most recently created should be first
    expect(sessions[0].title).toBe("Third");
  });

  it("state transition validation rejects invalid re-generation from generating", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const id = await t.mutation(api.sessions.create, {
      title: "Test",
      query: "test",
    });
    await t.mutation(api.sessions.startGeneration, { sessionId: id });
    await expect(
      t.mutation(api.sessions.startGeneration, { sessionId: id }),
    ).rejects.toThrow('Cannot start generation from state "generating"');
  });

  it("updateTitle changes the session title", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const id = await t.mutation(api.sessions.create, {
      title: "Original Title",
      query: "test",
    });
    await t.mutation(api.sessions.updateTitle, {
      sessionId: id,
      title: "New Title",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.title).toBe("New Title");
  });

  describe("getMostRecent", () => {
    it("returns null when no live sessions exist", async () => {
      const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
      const result = await t.query(api.sessions.getMostRecent, {});
      expect(result).toBeNull();
    });

    it("returns null when sessions exist but none are live", async () => {
      const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
      const id = await t.mutation(api.sessions.create, {
        title: "Idle Session",
        query: "test",
      });
      await t.mutation(api.sessions.startGeneration, { sessionId: id });
      const result = await t.query(api.sessions.getMostRecent, {});
      expect(result).toBeNull();
    });

    it("returns the live session when one exists", async () => {
      const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
      const id = await t.mutation(api.sessions.create, {
        title: "Live App",
        query: "Build a token board",
      });
      await t.mutation(api.sessions.startGeneration, { sessionId: id });
      await t.mutation(api.sessions.setLive, { sessionId: id });
      const result = await t.query(api.sessions.getMostRecent, {});
      expect(result).not.toBeNull();
      expect(result?._id).toBe(id);
      expect(result?.state).toBe(SESSION_STATES.LIVE);
      expect(result?.title).toBe("Live App");
    });

    it("returns the most recently created live session when multiple exist", async () => {
      const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
      const id1 = await t.mutation(api.sessions.create, {
        title: "First Live",
        query: "first",
      });
      await t.mutation(api.sessions.startGeneration, { sessionId: id1 });
      await t.mutation(api.sessions.setLive, { sessionId: id1 });
      const id2 = await t.mutation(api.sessions.create, {
        title: "Second Live",
        query: "second",
      });
      await t.mutation(api.sessions.startGeneration, { sessionId: id2 });
      await t.mutation(api.sessions.setLive, { sessionId: id2 });
      const result = await t.query(api.sessions.getMostRecent, {});
      expect(result?._id).toBe(id2);
      expect(result?.title).toBe("Second Live");
    });

    it("does not return failed or generating sessions", async () => {
      const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
      const idFailed = await t.mutation(api.sessions.create, {
        title: "Failed Session",
        query: "failed",
      });
      await t.mutation(api.sessions.startGeneration, { sessionId: idFailed });
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

  describe("authorization — cross-user rejection", () => {
    it("get returns null for another user's session", async () => {
      const t = convexTest(schema, modules);
      const id = await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.create, {
        title: "Private",
        query: "test",
      });
      const session = await t.withIdentity(OTHER_IDENTITY).query(api.sessions.get, { sessionId: id });
      expect(session).toBeNull();
    });

    it("get returns null when not authenticated", async () => {
      const t = convexTest(schema, modules);
      const id = await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.create, {
        title: "Test",
        query: "test",
      });
      const session = await t.query(api.sessions.get, { sessionId: id });
      expect(session).toBeNull();
    });

    it("startGeneration rejects cross-user access", async () => {
      const t = convexTest(schema, modules);
      const id = await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.create, {
        title: "Test",
        query: "test",
      });
      await expect(
        t.withIdentity(OTHER_IDENTITY).mutation(api.sessions.startGeneration, { sessionId: id }),
      ).rejects.toThrow("Not authorized");
    });

    it("updateTitle rejects cross-user access", async () => {
      const t = convexTest(schema, modules);
      const id = await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.create, {
        title: "Test",
        query: "test",
      });
      await expect(
        t.withIdentity(OTHER_IDENTITY).mutation(api.sessions.updateTitle, { sessionId: id, title: "Hacked" }),
      ).rejects.toThrow("Not authorized");
    });

    it("setBlueprint rejects cross-user access", async () => {
      const t = convexTest(schema, modules);
      const id = await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.create, {
        title: "Test",
        query: "test",
      });
      await expect(
        t.withIdentity(OTHER_IDENTITY).mutation(api.sessions.setBlueprint, { sessionId: id, blueprint: {} }),
      ).rejects.toThrow("Not authorized");
    });

    it("listByState only returns caller's sessions", async () => {
      const t = convexTest(schema, modules);
      const id = await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.create, {
        title: "User1 Live",
        query: "test",
      });
      await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.startGeneration, { sessionId: id });
      await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.setLive, { sessionId: id });
      const results = await t.withIdentity(OTHER_IDENTITY).query(api.sessions.listByState, { state: "live" });
      expect(results).toEqual([]);
    });

    it("getMostRecent only returns caller's live sessions", async () => {
      const t = convexTest(schema, modules);
      const id = await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.create, {
        title: "User1 Live",
        query: "test",
      });
      await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.startGeneration, { sessionId: id });
      await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.setLive, { sessionId: id });
      const result = await t.withIdentity(OTHER_IDENTITY).query(api.sessions.getMostRecent, {});
      expect(result).toBeNull();
    });
  });

  describe("state transition validation", () => {
    it("rejects idle → live (must go through generating)", async () => {
      const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
      const id = await t.mutation(api.sessions.create, { title: "Test", query: "test" });
      await expect(
        t.mutation(api.sessions.setLive, { sessionId: id }),
      ).rejects.toThrow('Cannot set live from state "idle"');
    });

    it("rejects idle → failed (must go through generating)", async () => {
      const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
      const id = await t.mutation(api.sessions.create, { title: "Test", query: "test" });
      await expect(
        t.mutation(api.sessions.setFailed, { sessionId: id, error: "test" }),
      ).rejects.toThrow('Cannot set failed from state "idle"');
    });

    it("allows idle → generating → live", async () => {
      const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
      const id = await t.mutation(api.sessions.create, { title: "Test", query: "test" });
      await t.mutation(api.sessions.startGeneration, { sessionId: id });
      await t.mutation(api.sessions.setLive, { sessionId: id });
      const session = await t.query(api.sessions.get, { sessionId: id });
      expect((session as { state: string }).state).toBe("live");
    });

    it("allows idle → generating → failed", async () => {
      const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
      const id = await t.mutation(api.sessions.create, { title: "Test", query: "test" });
      await t.mutation(api.sessions.startGeneration, { sessionId: id });
      await t.mutation(api.sessions.setFailed, { sessionId: id, error: "build error" });
      const session = await t.query(api.sessions.get, { sessionId: id });
      expect((session as { state: string }).state).toBe("failed");
    });

    it("allows re-generation from live state", async () => {
      const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
      const id = await t.mutation(api.sessions.create, { title: "Test", query: "test" });
      await t.mutation(api.sessions.startGeneration, { sessionId: id });
      await t.mutation(api.sessions.setLive, { sessionId: id });
      await t.mutation(api.sessions.startGeneration, { sessionId: id });
      const session = await t.query(api.sessions.get, { sessionId: id });
      expect((session as { state: string }).state).toBe("generating");
    });
  });
});
