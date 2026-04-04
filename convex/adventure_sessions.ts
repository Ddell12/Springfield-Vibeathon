import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

export const createAdventureSession = internalMutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    patientId: v.id("patients"),
    themeSlug: v.string(),
    targetSounds: v.array(v.string()),
    startTier: v.union(v.literal("word"), v.literal("phrase"), v.literal("sentence")),
    endTier: v.union(v.literal("word"), v.literal("phrase"), v.literal("sentence")),
    totalAttempts: v.number(),
    correctAttempts: v.number(),
    wordLog: v.array(v.object({
      content: v.string(),
      tier: v.union(v.literal("word"), v.literal("phrase"), v.literal("sentence")),
      correct: v.boolean(),
      timestamp: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("adventureSessions", args);
  },
});

export const recomputeProgressAfterSession = internalMutation({
  args: {
    adventureSessionId: v.id("adventureSessions"),
  },
  handler: async (ctx, { adventureSessionId }) => {
    const session = await ctx.db.get(adventureSessionId);
    if (!session) return;

    type TierKey = `${string}__${string}`;
    const groups = new Map<TierKey, { correct: number; total: number }>();

    for (const entry of session.wordLog) {
      for (const targetSound of session.targetSounds) {
        const key: TierKey = `${targetSound}__${entry.tier}`;
        const existing = groups.get(key) ?? { correct: 0, total: 0 };
        groups.set(key, {
          correct: existing.correct + (entry.correct ? 1 : 0),
          total: existing.total + 1,
        });
      }
    }

    const existingProgress = await ctx.db
      .query("adventureProgress")
      .withIndex("by_patient_theme", (q) =>
        q.eq("patientId", session.patientId).eq("themeSlug", session.themeSlug)
      )
      .collect();

    for (const [key, stats] of groups) {
      const [targetSound, tier] = key.split("__") as [string, "word" | "phrase" | "sentence"];
      const prior = existingProgress.find(
        (p) => p.targetSound === targetSound && p.tier === tier
      );
      const priorAttempts = prior?.attemptCount ?? 0;
      const cumulativeAttempts = priorAttempts + stats.total;
      const masteryPct = stats.total > 0 ? stats.correct / stats.total : (prior?.masteryPct ?? 0);
      const mastered = masteryPct >= 0.8 && cumulativeAttempts >= 10;

      if (prior) {
        await ctx.db.patch(prior._id, {
          masteryPct,
          attemptCount: cumulativeAttempts,
          lastSessionId: adventureSessionId,
          unlockedAt: mastered && !prior.unlockedAt ? Date.now() : prior.unlockedAt,
        });
      } else {
        await ctx.db.insert("adventureProgress", {
          patientId: session.patientId,
          themeSlug: session.themeSlug,
          targetSound,
          tier,
          masteryPct,
          attemptCount: cumulativeAttempts,
          lastSessionId: adventureSessionId,
          unlockedAt: mastered ? Date.now() : undefined,
        });
      }
    }
  },
});
