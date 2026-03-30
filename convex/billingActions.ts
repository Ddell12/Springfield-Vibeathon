"use node";

import { action } from "./_generated/server";

/**
 * Placeholder for invoice retrieval — needs Stripe customer ID mapping.
 * Returns an empty array until the Stripe customer lookup is implemented.
 */
export const getInvoices = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    // TODO: Map userId to Stripe customer ID and fetch invoices via Stripe API
    return [] as Array<{
      id: string;
      date: number;
      amount: number;
      status: string;
      pdfUrl: string | null;
    }>;
  },
});
