import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

/** One-time seed mutation to mark generated demo apps as featured.
 *  Run via Convex dashboard after generating the 6 demo tools. */
export const markFeatured = internalMutation({
  args: {
    items: v.array(
      v.object({
        sessionId: v.id("sessions"),
        category: v.string(),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      const app = await ctx.db
        .query("apps")
        .withIndex("by_session", (q) => q.eq("sessionId", item.sessionId))
        .first();
      if (app) {
        await ctx.db.patch(app._id, {
          featured: true,
          featuredOrder: item.order,
          featuredCategory: item.category,
        });
      }
    }
  },
});
