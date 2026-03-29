import { internalMutation } from "../_generated/server";

/**
 * One-time migration: delete legacy sessions that have no userId.
 *
 * These are pre-auth demo/test sessions with no real value. Run from the
 * Convex dashboard or via `npx convex run seeds/backfill-legacy-sessions:deleteLegacySessions`.
 *
 * Processes up to 500 rows per invocation. Re-run if more exist.
 */
export const deleteLegacySessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user")
      .take(500);
    const legacy = sessions.filter((s) => !s.userId);
    for (const s of legacy) {
      await ctx.db.delete(s._id);
    }
    return { deleted: legacy.length };
  },
});
