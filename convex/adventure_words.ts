import { v } from "convex/values";

import { query } from "./_generated/server";

export const listThemes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("adventureThemes").collect();
  },
});

// Returns a batch of words for the given theme × sound × tier × difficulty.
// Vocabulary data is not sensitive — no auth required.
export const getWordBatch = query({
  args: {
    themeSlug: v.string(),
    targetSound: v.string(),
    tier: v.union(v.literal("word"), v.literal("phrase"), v.literal("sentence")),
    difficulty: v.number(),
  },
  handler: async (ctx, { themeSlug, targetSound, tier, difficulty }) => {
    const rows = await ctx.db
      .query("adventureWords")
      .withIndex("by_themeSlug_targetSound_tier", (q) =>
        q.eq("themeSlug", themeSlug).eq("targetSound", targetSound).eq("tier", tier)
      )
      .collect();

    // Prefer exact difficulty match, fall back to ±1
    const exact = rows.filter((r) => r.difficulty === difficulty);
    const nearby = rows.filter(
      (r) => r.difficulty === difficulty - 1 || r.difficulty === difficulty + 1
    );
    const batch = exact.length >= 5 ? exact : [...exact, ...nearby];
    return shuffle(batch).slice(0, 10);
  },
});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
