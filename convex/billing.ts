import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

/**
 * Called when a payment fails (e.g., from a Stripe webhook).
 * Sets the user's billing status to "past_due".
 */
export const handlePaymentFailed = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query("userBilling")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        billingStatus: "past_due",
        pastDueSince: existing.pastDueSince ?? Date.now(),
      });
    } else {
      await ctx.db.insert("userBilling", {
        userId,
        billingStatus: "past_due",
        pastDueSince: Date.now(),
      });
    }
  },
});

/**
 * Downgrades users who have been past_due for more than 3 days.
 * Intended to be called by a cron job.
 */
export const autoDowngradePastDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

    const pastDueUsers = await ctx.db
      .query("userBilling")
      .withIndex("by_billingStatus", (q) => q.eq("billingStatus", "past_due"))
      .take(100);

    for (const user of pastDueUsers) {
      if (user.pastDueSince && user.pastDueSince < threeDaysAgo) {
        await ctx.db.patch(user._id, {
          billingStatus: "downgraded",
          pastDueSince: undefined,
        });
      }
    }
  },
});
