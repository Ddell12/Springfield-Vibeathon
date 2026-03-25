import { v } from "convex/values";

import { query } from "../_generated/server";

export const listTemplates = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("therapyTemplates")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    }
    return await ctx.db
      .query("therapyTemplates")
      .withIndex("by_sortOrder")
      .collect();
  },
});
