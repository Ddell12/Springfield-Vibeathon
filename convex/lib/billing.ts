import type { QueryCtx } from "../_generated/server";

export const FREE_LIMITS = {
  maxApps: 5,
  maxDecks: 10,
  maxGenerations: 20,
} as const;

export const PREMIUM_LIMITS = {
  maxApps: Infinity,
  maxDecks: Infinity,
  maxGenerations: Infinity,
} as const;

/**
 * Check if a user has an active premium subscription.
 * Reads from the @convex-dev/stripe component's tables.
 * Safe to call from queries and mutations (no "use node" needed).
 */
export async function checkPremiumStatus(
  ctx: QueryCtx,
  userId: string,
): Promise<boolean> {
  try {
    const { components } = await import("../_generated/api");
    const subscriptions = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId },
    );
    return subscriptions.some(
      (sub: { status: string }) =>
        sub.status === "active" || sub.status === "trialing",
    );
  } catch {
    // Component not available (e.g., convex-test environment) — default to free
    return false;
  }
}
