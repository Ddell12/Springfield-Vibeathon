import { internalMutation } from "../_generated/server";

/**
 * One-time migration: delete legacy sessions that have no userId.
 *
 * These are pre-auth demo/test sessions with no real value. Run from the
 * Convex dashboard or via `npx convex run seeds/backfill-legacy-sessions:deleteLegacySessions`.
 *
 * One-time cleanup — scans all sessions and deletes those with no owner.
 */
export const deleteLegacySessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect();
    const legacy = sessions.filter((s) => !s.userId);
    for (const s of legacy) {
      await ctx.db.delete(s._id);
    }
    return { deleted: legacy.length };
  },
});
