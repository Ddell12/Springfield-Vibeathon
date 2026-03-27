"use node";

import { StripeSubscriptions } from "@convex-dev/stripe";

import { components } from "./_generated/api";
import { action } from "./_generated/server";

const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID ?? "";

const stripeClient = new StripeSubscriptions(components.stripe, {});

export const createCheckoutSession = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const customer = await stripeClient.getOrCreateCustomer(ctx, {
      userId: identity.subject,
      email: identity.email ?? undefined,
      name: identity.name ?? undefined,
    });

    const session = await stripeClient.createCheckoutSession(ctx, {
      priceId: PREMIUM_PRICE_ID,
      customerId: customer.customerId,
      mode: "subscription",
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings?billing=success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings?billing=canceled`,
      subscriptionMetadata: {
        userId: identity.subject,
      },
    });

    return { url: session.url };
  },
});

export const createPortalSession = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const subscriptions = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId: identity.subject },
    );

    if (subscriptions.length === 0) {
      throw new Error("No subscription found");
    }

    const portal = await stripeClient.createCustomerPortalSession(ctx, {
      customerId: subscriptions[0].stripeCustomerId,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings`,
    });

    return { url: portal.url };
  },
});
