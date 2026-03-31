import { ConvexError, v } from "convex/values";

import { slpMutation, slpQuery } from "./lib/customFunctions";

// ── Validators ──────────────────────────────────────────────────────────────

const assessmentToolValidator = v.object({
  name: v.string(),
  scoresRaw: v.optional(v.string()),
  scoresStandard: v.optional(v.string()),
  percentile: v.optional(v.string()),
  notes: v.optional(v.string()),
});

const domainFindingValidator = v.optional(
  v.object({
    narrative: v.string(),
    scores: v.optional(v.string()),
  })
);

const domainFindingsValidator = v.object({
  articulation: domainFindingValidator,
  languageReceptive: domainFindingValidator,
  languageExpressive: domainFindingValidator,
  fluency: domainFindingValidator,
  voice: domainFindingValidator,
  pragmatics: domainFindingValidator,
  aac: domainFindingValidator,
});

const diagnosisCodeValidator = v.object({
  code: v.string(),
  description: v.string(),
});

const prognosisValidator = v.union(
  v.literal("excellent"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("guarded")
);

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("complete"),
  v.literal("signed")
);

// ── Queries ─────────────────────────────────────────────────────────────────

export const get = slpQuery({
  args: { evalId: v.id("evaluations") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authenticated");
    const evaluation = await ctx.db.get(args.evalId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    return evaluation;
  },
});

export const getByPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authenticated");
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("evaluations")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const create = slpMutation({
  args: {
    patientId: v.id("patients"),
    evaluationDate: v.string(),
    referralSource: v.optional(v.string()),
    backgroundHistory: v.string(),
    assessmentTools: v.array(assessmentToolValidator),
    domainFindings: domainFindingsValidator,
    behavioralObservations: v.string(),
    clinicalInterpretation: v.string(),
    diagnosisCodes: v.array(diagnosisCodeValidator),
    prognosis: prognosisValidator,
    recommendations: v.string(),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db.insert("evaluations", {
      patientId: args.patientId,
      slpUserId: ctx.slpUserId,
      evaluationDate: args.evaluationDate,
      referralSource: args.referralSource,
      backgroundHistory: args.backgroundHistory,
      assessmentTools: args.assessmentTools,
      domainFindings: args.domainFindings,
      behavioralObservations: args.behavioralObservations,
      clinicalInterpretation: args.clinicalInterpretation,
      diagnosisCodes: args.diagnosisCodes,
      prognosis: args.prognosis,
      recommendations: args.recommendations,
      status: "draft",
    });
  },
});

export const update = slpMutation({
  args: {
    evalId: v.id("evaluations"),
    evaluationDate: v.optional(v.string()),
    referralSource: v.optional(v.string()),
    backgroundHistory: v.optional(v.string()),
    assessmentTools: v.optional(v.array(assessmentToolValidator)),
    domainFindings: v.optional(domainFindingsValidator),
    behavioralObservations: v.optional(v.string()),
    clinicalInterpretation: v.optional(v.string()),
    diagnosisCodes: v.optional(v.array(diagnosisCodeValidator)),
    prognosis: v.optional(prognosisValidator),
    recommendations: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db.get(args.evalId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (evaluation.status === "signed") {
      throw new ConvexError("Cannot edit a signed evaluation");
    }

    const { evalId, ...updates } = args;
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filtered[key] = value;
    }
    await ctx.db.patch(args.evalId, filtered);
  },
});

export const updateStatus = slpMutation({
  args: {
    evalId: v.id("evaluations"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db.get(args.evalId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (evaluation.status === "signed") {
      throw new ConvexError("Cannot change status of a signed evaluation — use unsign first");
    }
    if (args.status === "signed") {
      throw new ConvexError("Cannot set status to signed — use the sign function");
    }
    await ctx.db.patch(args.evalId, { status: args.status });
  },
});

export const sign = slpMutation({
  args: { evalId: v.id("evaluations") },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db.get(args.evalId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (evaluation.status !== "complete") {
      throw new ConvexError("Only complete evaluations can be signed");
    }

    const now = Date.now();
    await ctx.db.patch(args.evalId, { status: "signed", signedAt: now });

    // Propagate ICD codes to patient record
    if (evaluation.diagnosisCodes.length > 0) {
      await ctx.db.patch(evaluation.patientId, {
        icdCodes: evaluation.diagnosisCodes,
      });
    }

    await ctx.db.insert("activityLog", {
      patientId: evaluation.patientId,
      actorUserId: ctx.slpUserId,
      action: "evaluation-signed",
      details: `Signed evaluation from ${evaluation.evaluationDate}`,
      timestamp: now,
    });
  },
});

export const unsign = slpMutation({
  args: { evalId: v.id("evaluations") },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db.get(args.evalId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (evaluation.status !== "signed") {
      throw new ConvexError("Only signed evaluations can be unsigned");
    }

    const now = Date.now();
    await ctx.db.patch(args.evalId, { status: "complete", signedAt: undefined });

    await ctx.db.insert("activityLog", {
      patientId: evaluation.patientId,
      actorUserId: ctx.slpUserId,
      action: "evaluation-unsigned",
      details: `Unsigned evaluation from ${evaluation.evaluationDate}`,
      timestamp: now,
    });
  },
});

export const saveFromAI = slpMutation({
  args: {
    evalId: v.id("evaluations"),
    clinicalInterpretation: v.string(),
    recommendations: v.string(),
  },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db.get(args.evalId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (evaluation.status === "signed") {
      throw new ConvexError("Cannot edit a signed evaluation");
    }

    await ctx.db.patch(args.evalId, {
      clinicalInterpretation: args.clinicalInterpretation,
      recommendations: args.recommendations,
    });
  },
});
