import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server";

export const getProgress = query({
  args: {
    patientId: v.id("patients"),
    themeSlug: v.optional(v.string()),
  },
  handler: async (ctx, { patientId, themeSlug }) => {
    if (themeSlug) {
      return await ctx.db
        .query("adventureProgress")
        .withIndex("by_patient_theme", (q) =>
          q.eq("patientId", patientId).eq("themeSlug", themeSlug)
        )
        .collect();
    }
    return await ctx.db
      .query("adventureProgress")
      .withIndex("by_patient_theme", (q) => q.eq("patientId", patientId))
      .collect();
  },
});

export const upsertProgress = internalMutation({
  args: {
    patientId: v.id("patients"),
    themeSlug: v.string(),
    targetSound: v.string(),
    tier: v.union(v.literal("word"), v.literal("phrase"), v.literal("sentence")),
    masteryPct: v.number(),
    attemptCount: v.number(),
    lastSessionId: v.id("adventureSessions"),
  },
  handler: async (ctx, { patientId, themeSlug, targetSound, tier, masteryPct, attemptCount, lastSessionId }) => {
    const existing = await ctx.db
      .query("adventureProgress")
      .withIndex("by_patient_theme", (q) =>
        q.eq("patientId", patientId).eq("themeSlug", themeSlug)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("targetSound"), targetSound),
          q.eq(q.field("tier"), tier)
        )
      )
      .first();

    const mastered = masteryPct >= 0.8 && attemptCount >= 10;

    if (existing) {
      await ctx.db.patch(existing._id, {
        masteryPct,
        attemptCount,
        lastSessionId,
        unlockedAt: mastered && !existing.unlockedAt ? Date.now() : existing.unlockedAt,
      });
    } else {
      await ctx.db.insert("adventureProgress", {
        patientId,
        themeSlug,
        targetSound,
        tier,
        masteryPct,
        attemptCount,
        lastSessionId,
        unlockedAt: mastered ? Date.now() : undefined,
      });
    }
  },
});
