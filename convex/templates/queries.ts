import { v } from "convex/values";

import { query } from "../_generated/server";

export const listTemplates = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("tools")
        .withIndex("by_template", (q) =>
          q.eq("isTemplate", true).eq("templateCategory", args.category),
        )
        .collect();
    }
    return await ctx.db
      .query("tools")
      .withIndex("by_template", (q) => q.eq("isTemplate", true))
      .collect();
  },
});
