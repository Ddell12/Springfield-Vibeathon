import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { slpMutation, slpQuery } from "./lib/customFunctions";
import { speechCoachTemplateValidator } from "./lib/speechCoachValidators";

export const listMine = slpQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.slpUserId) return [];
    return await ctx.db
      .query("speechCoachTemplates")
      .withIndex("by_slpUserId_updatedAt", (q) =>
        q.eq("slpUserId", ctx.slpUserId!)
      )
      .order("desc")
      .take(100);
  },
});

export const create = slpMutation({
  args: { template: speechCoachTemplateValidator },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("speechCoachTemplates", {
      ...args.template,
      slpUserId: ctx.slpUserId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = slpMutation({
  args: {
    templateId: v.id("speechCoachTemplates"),
    template: speechCoachTemplateValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.templateId);
    if (!existing || existing.slpUserId !== ctx.slpUserId) {
      throw new ConvexError("Template not found");
    }

    await ctx.db.patch(args.templateId, {
      ...args.template,
      updatedAt: Date.now(),
    });
  },
});
