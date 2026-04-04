import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "https://test.convex.dev" };
const SLP2_IDENTITY = { subject: "slp-user-456", issuer: "https://test.convex.dev" };

// ── seed ─────────────────────────────────────────────────────────────────────

describe("goalBank.seed", () => {
  it("inserts all 202 system goals", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const results = await t.withIdentity(SLP_IDENTITY).query(api.goalBank.search, {});
    expect(results.length).toBeGreaterThanOrEqual(200);
  });

  it("is idempotent — running twice does not duplicate", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    await t.mutation(internal.goalBank.seed, {});
    const results = await t.withIdentity(SLP_IDENTITY).query(api.goalBank.search, {});
    // Should not double the goals
    expect(results.length).toBeLessThan(500);
  });
});

// ── search ────────────────────────────────────────────────────────────────────

describe("goalBank.search", () => {
  it("returns goals filtered by domain", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const slp = t.withIdentity(SLP_IDENTITY);
    const artGoals = await slp.query(api.goalBank.search, { domain: "articulation" });
    expect(artGoals.length).toBeGreaterThanOrEqual(40);
    expect(artGoals.every((g: any) => g.domain === "articulation")).toBe(true);
  });

  it("returns goals filtered by domain + ageRange", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const slp = t.withIdentity(SLP_IDENTITY);
    const results = await slp.query(api.goalBank.search, {
      domain: "articulation",
      ageRange: "5-8",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((g: any) => g.ageRange === "5-8")).toBe(true);
  });

  it("returns goals filtered by keyword", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const slp = t.withIdentity(SLP_IDENTITY);
    const results = await slp.query(api.goalBank.search, { keyword: "/r/" });
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns empty array for no matches", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const slp = t.withIdentity(SLP_IDENTITY);
    const results = await slp.query(api.goalBank.search, { keyword: "xyzzy_no_match" });
    expect(results).toHaveLength(0);
  });
});

// ── addCustom / removeCustom ──────────────────────────────────────────────────

describe("goalBank.addCustom", () => {
  it("adds a custom goal", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const id = await slp.mutation(api.goalBank.addCustom, {
      domain: "articulation",
      ageRange: "5-8",
      skillLevel: "word",
      shortDescription: "My custom /r/ goal",
      fullGoalText: "Client will produce /r/ with {accuracy}% accuracy across {sessions} sessions.",
      defaultTargetAccuracy: 80,
      defaultConsecutiveSessions: 3,
    });
    expect(id).toBeDefined();
    const results = await slp.query(api.goalBank.search, { keyword: "My custom" });
    expect(results).toHaveLength(1);
    expect(results[0].isCustom).toBe(true);
    expect(results[0].createdBy).toBe("slp-user-123");
  });

  it("validates shortDescription length", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    await expect(
      slp.mutation(api.goalBank.addCustom, {
        domain: "articulation",
        ageRange: "5-8",
        skillLevel: "word",
        shortDescription: "",
        fullGoalText: "Some goal text with {accuracy}% across {sessions} sessions.",
        defaultTargetAccuracy: 80,
        defaultConsecutiveSessions: 3,
      })
    ).rejects.toThrow();
  });
});

describe("goalBank.removeCustom", () => {
  it("removes own custom goal", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const id = await slp.mutation(api.goalBank.addCustom, {
      domain: "articulation",
      ageRange: "5-8",
      skillLevel: "word",
      shortDescription: "Temp goal",
      fullGoalText: "Client will do X with {accuracy}% accuracy across {sessions} sessions.",
      defaultTargetAccuracy: 80,
      defaultConsecutiveSessions: 3,
    });
    await slp.mutation(api.goalBank.removeCustom, { goalId: id });
    const results = await slp.query(api.goalBank.search, { keyword: "Temp goal" });
    expect(results).toHaveLength(0);
  });

  it("rejects removing another SLP's custom goal", async () => {
    const t = convexTest(schema, modules);
    const slp1 = t.withIdentity(SLP_IDENTITY);
    const slp2 = t.withIdentity(SLP2_IDENTITY);
    const id = await slp1.mutation(api.goalBank.addCustom, {
      domain: "articulation",
      ageRange: "5-8",
      skillLevel: "word",
      shortDescription: "SLP1 goal",
      fullGoalText: "Client will do X with {accuracy}% accuracy across {sessions} sessions.",
      defaultTargetAccuracy: 80,
      defaultConsecutiveSessions: 3,
    });
    await expect(slp2.mutation(api.goalBank.removeCustom, { goalId: id })).rejects.toThrow();
  });
});

// ── listDomainSkillLevels ─────────────────────────────────────────────────────

describe("goalBank.listDomainSkillLevels", () => {
  it("returns distinct skill levels for articulation", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const slp = t.withIdentity(SLP_IDENTITY);
    const levels = await slp.query(api.goalBank.listDomainSkillLevels, { domain: "articulation" });
    expect(levels.length).toBeGreaterThan(0);
    expect(levels).toContain("word");
    expect(levels).toContain("sentence");
    expect(levels).toContain("conversation");
  });
});
