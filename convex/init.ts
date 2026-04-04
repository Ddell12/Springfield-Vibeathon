"use node";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

export const init = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    await ctx.runAction(internal.knowledge.seed.seedKnowledge, {});
    await ctx.runMutation(internal.templates.seed.seedTemplates, {});
    await ctx.runMutation(internal.goalBank.seed, {});
    await ctx.runMutation(internal.seeds.adventure_seed.seedAdventureData, {});
  },
});
