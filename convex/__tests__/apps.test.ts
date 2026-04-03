// convex/__tests__/apps.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import { FREE_LIMITS } from "../lib/billing";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s"); // REQUIRED for convex-test

const TEST_IDENTITY = { subject: "test-user-123", issuer: "https://test.convex.dev" };
const OTHER_IDENTITY = { subject: "other-user-456", issuer: "https://test.convex.dev" };

describe("apps", () => {
  it("create and get roundtrip", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const appId = await t.mutation(api.apps.create, {
      title: "Token Board",
      description: "A reinforcement token board for ABA therapy",
      shareSlug: "token-board-abc123",
    });
    const app = await t.query(api.apps.get, { appId });
    expect(app).not.toBeNull();
    expect(app?.title).toBe("Token Board");
    expect(app?.description).toBe("A reinforcement token board for ABA therapy");
    expect(app?.shareSlug).toBe("token-board-abc123");
  });

  it("getByShareSlug returns app for matching slug", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    await t.mutation(api.apps.create, {
      title: "Communication Board",
      description: "A picture communication board",
      shareSlug: "comm-board-xyz789",
    });
    const app = await t.query(api.apps.getByShareSlug, { shareSlug: "comm-board-xyz789" });
    expect(app).not.toBeNull();
    expect(app?.title).toBe("Communication Board");
  });

  it("getByShareSlug returns null for unknown slug", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const app = await t.query(api.apps.getByShareSlug, { shareSlug: "nonexistent-slug" });
    expect(app).toBeNull();
  });

  it("update patches title and description", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const appId = await t.mutation(api.apps.create, {
      title: "Old Title",
      description: "Old description",
      shareSlug: "update-test-slug",
    });
    await t.mutation(api.apps.update, {
      appId,
      title: "New Title",
      description: "New description",
    });
    const app = await t.query(api.apps.get, { appId });
    expect(app?.title).toBe("New Title");
    expect(app?.description).toBe("New description");
  });

  it("list returns created apps ordered by creation time descending", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    await t.mutation(api.apps.create, {
      title: "App One",
      description: "First app",
      shareSlug: "app-one",
    });
    await t.mutation(api.apps.create, {
      title: "App Two",
      description: "Second app",
      shareSlug: "app-two",
    });
    const apps = await t.query(api.apps.list, {});
    expect(apps.length).toBeGreaterThanOrEqual(2);
    // Most recently created app should be first
    expect(apps[0].title).toBe("App Two");
  });

  it("getBySession returns app linked to session", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test Session",
      query: "Build a therapy app",
    });
    const appId = await t.mutation(api.apps.create, {
      title: "Session App",
      description: "App linked to session",
      shareSlug: "session-linked-app",
      sessionId,
    });
    const app = await t.query(api.apps.getBySession, { sessionId });
    expect(app).not.toBeNull();
    expect(app?._id).toBe(appId);
    expect(app?.title).toBe("Session App");
  });

  it("getBySession returns null for session with no app", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Orphan Session",
      query: "test",
    });
    const app = await t.query(api.apps.getBySession, { sessionId });
    expect(app).toBeNull();
  });

  describe("authorization — cross-user rejection", () => {
    it("get returns null for another user's app", async () => {
      const t = convexTest(schema, modules);
      const appId = await t.withIdentity(TEST_IDENTITY).mutation(api.apps.create, {
        title: "Private App",
        description: "Secret",
        shareSlug: "private-slug",
      });
      const app = await t.withIdentity(OTHER_IDENTITY).query(api.apps.get, { appId });
      expect(app).toBeNull();
    });

    it("update throws for non-owner", async () => {
      const t = convexTest(schema, modules);
      const appId = await t.withIdentity(TEST_IDENTITY).mutation(api.apps.create, {
        title: "My App",
        description: "Mine",
        shareSlug: "my-slug",
      });
      await expect(
        t.withIdentity(OTHER_IDENTITY).mutation(api.apps.update, { appId, title: "Hacked" }),
      ).rejects.toThrow("Not authorized");
    });

    it("getBySession returns null for non-owner's session", async () => {
      const t = convexTest(schema, modules);
      const sessionId = await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.create, {
        title: "Test Session",
        query: "test",
      });
      await t.withIdentity(TEST_IDENTITY).mutation(api.apps.create, {
        title: "Session App",
        description: "Linked",
        shareSlug: "linked-slug",
        sessionId,
      });
      const app = await t.withIdentity(OTHER_IDENTITY).query(api.apps.getBySession, { sessionId });
      expect(app).toBeNull();
    });

    it("getByShareSlug remains public (no auth required)", async () => {
      const t = convexTest(schema, modules);
      await t.withIdentity(TEST_IDENTITY).mutation(api.apps.create, {
        title: "Shared App",
        description: "Public",
        shareSlug: "public-slug-123",
      });
      // Query without any identity — should still work
      const app = await t.query(api.apps.getByShareSlug, { shareSlug: "public-slug-123" });
      expect(app).not.toBeNull();
      expect(app?.title).toBe("Shared App");
    });

    it("ensureForSession generates a 12-character slug", async () => {
      const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
      const sessionId = await t.mutation(api.sessions.create, {
        title: "Test",
        query: "test",
      });
      const app = await t.mutation(api.apps.ensureForSession, { sessionId, title: "Test App" });
      expect(app?.shareSlug).toHaveLength(12);
    });

    it("allows share provisioning for an existing session even when the user is at the free saved-app cap", async () => {
      const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
      const sessionId = await t.mutation(api.sessions.create, {
        title: "Shareable app",
        query: "test",
      });
      const existingAppId = await t.mutation(api.apps.create, {
        title: "Shareable app",
        description: "pre-existing session app",
        shareSlug: "shareable-app-existing",
        sessionId,
      });

      for (let i = 0; i < FREE_LIMITS.maxApps - 1; i++) {
        await t.mutation(api.apps.create, {
          title: `App ${i}`,
          description: "seed",
          shareSlug: `cap-slug-${i}`,
        });
      }

      const app = await t.mutation(api.apps.ensureForSession, {
        sessionId,
        title: "Shareable app",
      });

      expect(app?._id).toBe(existingAppId);
      expect(app?.shareSlug).toBe("shareable-app-existing");
    });
  });
});
