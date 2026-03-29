import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const TEST_IDENTITY = { subject: "admin-user-001", issuer: "clerk" };

describe("apps.listFeatured — public featured apps query", () => {
  it("returns featured apps ordered by featuredOrder", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);

    const sessionA = await t.mutation(api.sessions.create, { title: "A", query: "a" });
    const sessionB = await t.mutation(api.sessions.create, { title: "B", query: "b" });

    await t.mutation(api.apps.create, {
      title: "Emotion Check-In",
      description: "Feelings picker",
      shareSlug: "feat-emo",
      sessionId: sessionA,
    });
    await t.mutation(api.apps.create, {
      title: "Communication Board",
      description: "AAC board",
      shareSlug: "feat-comm",
      sessionId: sessionB,
    });
    await t.mutation(api.apps.create, {
      title: "User App",
      description: "Not featured",
      shareSlug: "user-app",
    });

    const allApps = await t.run(async (ctx) => {
      return await ctx.db.query("apps").collect();
    });
    const emoApp = allApps.find((a) => a.shareSlug === "feat-emo")!;
    const commApp = allApps.find((a) => a.shareSlug === "feat-comm")!;

    await t.run(async (ctx) => {
      await ctx.db.patch(emoApp._id, { featured: true, featuredOrder: 2, featuredCategory: "emotional" });
      await ctx.db.patch(commApp._id, { featured: true, featuredOrder: 1, featuredCategory: "communication" });
    });

    // listFeatured is a public query (no auth check)
    const featured = await t.query(api.apps.listFeatured, {});

    expect(featured).toHaveLength(2);
    expect(featured[0].title).toBe("Communication Board");
    expect(featured[0].featuredCategory).toBe("communication");
    expect(featured[1].title).toBe("Emotion Check-In");
    expect(featured[0]).not.toHaveProperty("userId");
    expect(featured[0]).not.toHaveProperty("sessionId");
  });

  it("returns empty array when no featured apps exist", async () => {
    const t = convexTest(schema, modules);
    const featured = await t.query(api.apps.listFeatured, {});
    expect(featured).toEqual([]);
  });
});
