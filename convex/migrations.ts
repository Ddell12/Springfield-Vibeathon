import { internalMutation } from "./_generated/server";

export const backfillTitleLower = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("app_instances").collect();
    let patched = 0;
    for (const doc of all) {
      if (doc.titleLower === undefined) {
        await ctx.db.patch(doc._id, { titleLower: doc.title.trim().toLowerCase() });
        patched++;
      }
    }
    return { patched, total: all.length };
  },
});
