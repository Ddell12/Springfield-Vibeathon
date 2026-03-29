import { v } from "convex/values";

import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./lib/auth";
import { checkPremiumStatus, FREE_LIMITS } from "./lib/billing";

/** Get the start of the current billing period (first of the month, UTC). */
function getCurrentPeriodStart(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

/** Get or create the usage record for the current period. */
async function getOrCreateUsage(
  ctx: QueryCtx | MutationCtx,
  userId: string,
) {
  const periodStart = getCurrentPeriodStart();
  const existing = await ctx.db
    .query("usage")
    .withIndex("by_userId_period", (q) =>
      q.eq("userId", userId).eq("periodStart", periodStart),
    )
    .first();
  return existing ?? { userId, periodStart, generationCount: 0, appCount: 0 };
}

export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { generationCount: 0, appCount: 0, periodStart: getCurrentPeriodStart() };
    }
    const usage = await getOrCreateUsage(ctx, userId);
    return {
      generationCount: usage.generationCount,
      appCount: usage.appCount,
      periodStart: usage.periodStart,
    };
  },
});

export const checkQuota = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { allowed: true } as { allowed: boolean; reason?: string };
    }

    const isPremium = await checkPremiumStatus(ctx, userId);
    if (isPremium) {
      return { allowed: true } as { allowed: boolean; reason?: string };
    }

    const usage = await getOrCreateUsage(ctx, userId);

    if (usage.appCount >= FREE_LIMITS.maxApps) {
      return {
        allowed: false,
        reason: `You've reached the free plan limit of ${FREE_LIMITS.maxApps} apps. Upgrade to Premium for unlimited apps.`,
      };
    }

    if (usage.generationCount >= FREE_LIMITS.maxGenerations) {
      return {
        allowed: false,
        reason: `You've used all ${FREE_LIMITS.maxGenerations} free generations this month. Upgrade to Premium for unlimited generations.`,
      };
    }

    return { allowed: true } as { allowed: boolean; reason?: string };
  },
});

export const incrementGeneration = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const periodStart = getCurrentPeriodStart();
    const existing = await ctx.db
      .query("usage")
      .withIndex("by_userId_period", (q) =>
        q.eq("userId", userId).eq("periodStart", periodStart),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        generationCount: existing.generationCount + 1,
      });
    } else {
      await ctx.db.insert("usage", {
        userId,
        periodStart,
        generationCount: 1,
        appCount: 0,
      });
    }
  },
});

export const incrementApp = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const periodStart = getCurrentPeriodStart();
    const existing = await ctx.db
      .query("usage")
      .withIndex("by_userId_period", (q) =>
        q.eq("userId", userId).eq("periodStart", periodStart),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        appCount: existing.appCount + 1,
      });
    } else {
      await ctx.db.insert("usage", {
        userId,
        periodStart,
        generationCount: 0,
        appCount: 1,
      });
    }
  },
});
