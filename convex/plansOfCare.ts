import { ConvexError, v } from "convex/values";

import { slpMutation, slpQuery } from "./lib/customFunctions";

// ── Validators ──────────────────────────────────────────────────────────────

const diagnosisCodeValidator = v.object({
  code: v.string(),
  description: v.string(),
});

// ── Queries ─────────────────────────────────────────────────────────────────

export const get = slpQuery({
  args: { pocId: v.id("plansOfCare") },
  handler: async (ctx, args) => {
    const poc = await ctx.db.get(args.pocId);
    if (!poc) throw new ConvexError("Plan of Care not found");
    if (poc.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    return poc;
  },
});

export const getActiveByPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("plansOfCare")
      .withIndex("by_patientId_status", (q) =>
        q.eq("patientId", args.patientId).eq("status", "active")
      )
      .first() ?? null;
  },
});

export const getByPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("plansOfCare")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const create = slpMutation({
  args: {
    patientId: v.id("patients"),
    evaluationId: v.optional(v.id("evaluations")),
    diagnosisCodes: v.array(diagnosisCodeValidator),
    longTermGoals: v.array(v.string()),
    shortTermGoals: v.array(v.string()),
    frequency: v.string(),
    sessionDuration: v.string(),
    planDuration: v.string(),
    projectedDischargeDate: v.optional(v.string()),
    dischargeCriteria: v.string(),
    physicianName: v.optional(v.string()),
    physicianNPI: v.optional(v.string()),
    physicianSignatureOnFile: v.boolean(),
    physicianSignatureDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db.insert("plansOfCare", {
      patientId: args.patientId,
      slpUserId: ctx.slpUserId,
      evaluationId: args.evaluationId,
      diagnosisCodes: args.diagnosisCodes,
      longTermGoals: args.longTermGoals,
      shortTermGoals: args.shortTermGoals,
      frequency: args.frequency,
      sessionDuration: args.sessionDuration,
      planDuration: args.planDuration,
      projectedDischargeDate: args.projectedDischargeDate,
      dischargeCriteria: args.dischargeCriteria,
      physicianName: args.physicianName,
      physicianNPI: args.physicianNPI,
      physicianSignatureOnFile: args.physicianSignatureOnFile,
      physicianSignatureDate: args.physicianSignatureDate,
      status: "draft",
      version: 1,
    });
  },
});

export const update = slpMutation({
  args: {
    pocId: v.id("plansOfCare"),
    diagnosisCodes: v.optional(v.array(diagnosisCodeValidator)),
    longTermGoals: v.optional(v.array(v.string())),
    shortTermGoals: v.optional(v.array(v.string())),
    frequency: v.optional(v.string()),
    sessionDuration: v.optional(v.string()),
    planDuration: v.optional(v.string()),
    projectedDischargeDate: v.optional(v.string()),
    dischargeCriteria: v.optional(v.string()),
    physicianName: v.optional(v.string()),
    physicianNPI: v.optional(v.string()),
    physicianSignatureOnFile: v.optional(v.boolean()),
    physicianSignatureDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const poc = await ctx.db.get(args.pocId);
    if (!poc) throw new ConvexError("Plan of Care not found");
    if (poc.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (poc.status === "amended" || poc.status === "expired") {
      throw new ConvexError("Cannot edit an amended or expired Plan of Care");
    }

    const { pocId: _pocId, ...updates } = args;
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filtered[key] = value;
    }
    await ctx.db.patch(args.pocId, filtered);
  },
});

export const sign = slpMutation({
  args: { pocId: v.id("plansOfCare") },
  handler: async (ctx, args) => {
    const poc = await ctx.db.get(args.pocId);
    if (!poc) throw new ConvexError("Plan of Care not found");
    if (poc.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (poc.status !== "draft") {
      throw new ConvexError("Only draft Plans of Care can be signed");
    }

    const now = Date.now();
    await ctx.db.patch(args.pocId, { status: "active", signedAt: now });

    await ctx.db.insert("activityLog", {
      patientId: poc.patientId,
      actorUserId: ctx.slpUserId,
      action: "poc-signed",
      details: `Signed Plan of Care v${poc.version}`,
      timestamp: now,
    });
  },
});

export const amend = slpMutation({
  args: {
    pocId: v.id("plansOfCare"),
    frequency: v.optional(v.string()),
    sessionDuration: v.optional(v.string()),
    planDuration: v.optional(v.string()),
    projectedDischargeDate: v.optional(v.string()),
    dischargeCriteria: v.optional(v.string()),
    longTermGoals: v.optional(v.array(v.string())),
    shortTermGoals: v.optional(v.array(v.string())),
    diagnosisCodes: v.optional(v.array(diagnosisCodeValidator)),
    physicianName: v.optional(v.string()),
    physicianNPI: v.optional(v.string()),
    physicianSignatureOnFile: v.optional(v.boolean()),
    physicianSignatureDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const oldPoc = await ctx.db.get(args.pocId);
    if (!oldPoc) throw new ConvexError("Plan of Care not found");
    if (oldPoc.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (oldPoc.status !== "active") {
      throw new ConvexError("Only active Plans of Care can be amended");
    }

    // Mark old version as amended
    await ctx.db.patch(args.pocId, { status: "amended" });

    // Create new version with overrides
    const { pocId: _pocId, ...overrides } = args;
    const newPocId = await ctx.db.insert("plansOfCare", {
      patientId: oldPoc.patientId,
      slpUserId: ctx.slpUserId,
      evaluationId: oldPoc.evaluationId,
      diagnosisCodes: overrides.diagnosisCodes ?? oldPoc.diagnosisCodes,
      longTermGoals: overrides.longTermGoals ?? oldPoc.longTermGoals,
      shortTermGoals: overrides.shortTermGoals ?? oldPoc.shortTermGoals,
      frequency: overrides.frequency ?? oldPoc.frequency,
      sessionDuration: overrides.sessionDuration ?? oldPoc.sessionDuration,
      planDuration: overrides.planDuration ?? oldPoc.planDuration,
      projectedDischargeDate: overrides.projectedDischargeDate ?? oldPoc.projectedDischargeDate,
      dischargeCriteria: overrides.dischargeCriteria ?? oldPoc.dischargeCriteria,
      physicianName: overrides.physicianName ?? oldPoc.physicianName,
      physicianNPI: overrides.physicianNPI ?? oldPoc.physicianNPI,
      physicianSignatureOnFile: overrides.physicianSignatureOnFile ?? oldPoc.physicianSignatureOnFile,
      physicianSignatureDate: overrides.physicianSignatureDate ?? oldPoc.physicianSignatureDate,
      status: "draft",
      version: oldPoc.version + 1,
      previousVersionId: args.pocId,
    });

    await ctx.db.insert("activityLog", {
      patientId: oldPoc.patientId,
      actorUserId: ctx.slpUserId,
      action: "poc-amended",
      details: `Amended Plan of Care from v${oldPoc.version} to v${oldPoc.version + 1}`,
      timestamp: Date.now(),
    });

    return newPocId;
  },
});
