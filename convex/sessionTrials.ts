import { ConvexError, v } from "convex/values";

import { slpMutation, slpQuery } from "./lib/customFunctions";

const cueLevelValidator = v.union(
  v.literal("independent"),
  v.literal("min-cue"),
  v.literal("mod-cue"),
  v.literal("max-cue")
);

const CUE_TO_PROMPT: Record<string, "independent" | "verbal-cue" | "model" | "physical"> = {
  "independent": "independent",
  "min-cue": "verbal-cue",
  "mod-cue": "model",
  "max-cue": "physical",
};

function mostFrequentCueLevel(
  trials: Array<{ cueLevel: string }>
): "independent" | "verbal-cue" | "model" | "physical" {
  const counts: Record<string, number> = {};
  for (const trial of trials) {
    counts[trial.cueLevel] = (counts[trial.cueLevel] ?? 0) + 1;
  }
  let maxCue = "independent";
  let maxCount = 0;
  for (const [cue, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxCue = cue;
    }
  }
  return CUE_TO_PROMPT[maxCue] ?? "independent";
}

export const start = slpMutation({
  args: {
    patientId: v.id("patients"),
    goalId: v.id("goals"),
    sessionDate: v.string(),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (goal.patientId !== args.patientId) throw new ConvexError("Goal does not belong to this patient");

    return await ctx.db.insert("sessionTrials", {
      patientId: args.patientId,
      slpUserId: ctx.slpUserId,
      goalId: args.goalId,
      targetDescription: goal.shortDescription,
      trials: [],
      sessionDate: args.sessionDate,
      startedAt: Date.now(),
    });
  },
});

export const recordTrial = slpMutation({
  args: {
    trialId: v.id("sessionTrials"),
    correct: v.boolean(),
    cueLevel: cueLevelValidator,
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.trialId);
    if (!record) throw new ConvexError("Trial collection not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.endedAt !== undefined) throw new ConvexError("Collection already ended");

    await ctx.db.patch(args.trialId, {
      trials: [...record.trials, {
        correct: args.correct,
        cueLevel: args.cueLevel,
        timestamp: Date.now(),
      }],
    });
  },
});

export const endCollection = slpMutation({
  args: { trialId: v.id("sessionTrials") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.trialId);
    if (!record) throw new ConvexError("Trial collection not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.endedAt !== undefined) throw new ConvexError("Collection already ended");

    await ctx.db.patch(args.trialId, { endedAt: Date.now() });
  },
});

export const linkToSessionNote = slpMutation({
  args: {
    trialIds: v.array(v.id("sessionTrials")),
    sessionNoteId: v.id("sessionNotes"),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.sessionNoteId);
    if (!note) throw new ConvexError("Session note not found");
    if (note.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    const targetsWorkedOn: Array<{
      target: string;
      goalId?: string;
      trials?: number;
      correct?: number;
      promptLevel?: "independent" | "verbal-cue" | "model" | "physical";
    }> = [];

    for (const trialId of args.trialIds) {
      const record = await ctx.db.get(trialId);
      if (!record) continue;
      if (record.slpUserId !== ctx.slpUserId) continue;

      await ctx.db.patch(trialId, { sessionNoteId: args.sessionNoteId });

      targetsWorkedOn.push({
        target: record.targetDescription,
        goalId: record.goalId as string,
        trials: record.trials.length,
        correct: record.trials.filter((t) => t.correct).length,
        promptLevel: record.trials.length > 0 ? mostFrequentCueLevel(record.trials) : undefined,
      });
    }

    return targetsWorkedOn;
  },
});

export const getActiveForPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) return [];

    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    const all = await ctx.db
      .query("sessionTrials")
      .withIndex("by_patientId_sessionDate", (q) => q.eq("patientId", args.patientId))
      .take(500);

    return all.filter((r) => r.endedAt === undefined);
  },
});

export const listBySessionNote = slpQuery({
  args: { sessionNoteId: v.id("sessionNotes") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) return [];

    return await ctx.db
      .query("sessionTrials")
      .withIndex("by_sessionNoteId", (q) => q.eq("sessionNoteId", args.sessionNoteId))
      .take(500);
  },
});

export const listByPatientDate = slpQuery({
  args: {
    patientId: v.id("patients"),
    sessionDate: v.string(),
  },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) return [];

    return await ctx.db
      .query("sessionTrials")
      .withIndex("by_patientId_sessionDate", (q) =>
        q.eq("patientId", args.patientId).eq("sessionDate", args.sessionDate)
      )
      .take(500);
  },
});
