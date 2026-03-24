"use node";

import { v } from "convex/values";

import { internalAction } from "../_generated/server";
import { rag } from "./seed";

export const searchKnowledgeAction = internalAction({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<string> => {
    const result = await rag.search(ctx, {
      namespace: "therapy-knowledge",
      query: args.query,
      filters: args.category
        ? [{ name: "category", value: args.category }]
        : undefined,
      limit: args.limit ?? 5,
    });
    return result.text;
  },
});
