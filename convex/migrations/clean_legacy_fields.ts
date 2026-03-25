import { internalMutation } from "../_generated/server";

/**
 * Clears legacy pipeline fields from existing documents.
 * These fields were left over from the old phasic pipeline (deleted in the
 * streaming-builder refactor) and have zero code references outside schema.ts.
 *
 * Run once via the Convex dashboard → Functions → run internal function.
 */
export const cleanLegacySessionFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect();
    for (const session of sessions) {
      await ctx.db.patch(session._id, {
        currentPhaseIndex: undefined,
        phasesRemaining: undefined,
        mvpGenerated: undefined,
        templateName: undefined,
        blueprintId: undefined,
        failureReason: undefined,
        lastGoodState: undefined,
      });
    }
    return { sessionsPatched: sessions.length };
  },
});

export const cleanLegacyFileFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const files = await ctx.db.query("files").collect();
    for (const file of files) {
      await ctx.db.patch(file._id, {
        phaseId: undefined,
        purpose: undefined,
        status: undefined,
      });
    }
    return { filesPatched: files.length };
  },
});

export const cleanLegacyTemplateFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("therapyTemplates").collect();
    for (const template of templates) {
      await ctx.db.patch(template._id, {
        exampleFragment: undefined,
      });
    }
    return { templatesPatched: templates.length };
  },
});
