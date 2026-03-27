import { components } from "./_generated/api";
import { query } from "./_generated/server";
import { FREE_LIMITS, PREMIUM_LIMITS } from "./lib/billing";

export const getEntitlements = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { plan: "free" as const, limits: FREE_LIMITS };
    }

    const subscriptions = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId: identity.subject },
    );

    const hasActive = subscriptions.some(
      (sub) => sub.status === "active" || sub.status === "trialing",
    );

    if (hasActive) {
      return { plan: "premium" as const, limits: PREMIUM_LIMITS };
    }

    return { plan: "free" as const, limits: FREE_LIMITS };
  },
});
