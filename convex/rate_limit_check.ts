import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { rateLimiter } from "./rate_limits";

export const checkGenerateLimit = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const result = await rateLimiter.limit(ctx, "generateApp", { key: args.key });
    if (!result.ok) {
      throw new Error(`Rate limited. Retry after ${Math.ceil(result.retryAfter / 1000)}s`);
    }
  },
});
