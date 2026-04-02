import { ConvexError, v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { slpMutation, slpQuery } from "./lib/customFunctions";

// ── Internal Mutations ─────────────────────────────────────────────────────

export const createFromSessionNote = internalMutation({
  args: {
    sessionNoteId: v.id("sessionNotes"),
    slpUserId: v.string(),
    patientId: v.id("patients"),
    sessionDate: v.string(),
    sessionType: v.union(
      v.literal("in-person"),
      v.literal("teletherapy"),
      v.literal("parent-consultation")
    ),
  },
  handler: async (ctx, args) => {
    // Idempotency guard
    const existing = await ctx.db
      .query("billingRecords")
      .withIndex("by_sessionNoteId", (q) => q.eq("sessionNoteId", args.sessionNoteId))
      .first();
    if (existing) return existing._id;

    const sessionNote = await ctx.db.get(args.sessionNoteId);

    const cptCode = "92507";
    const cptDescription = "individual speech/language/voice treatment";

    const modifiers: string[] = ["GP"];
    if (args.sessionType === "teletherapy") modifiers.push("95");

    const placeOfService = args.sessionType === "teletherapy" ? "02" : "11";

    const profile = await ctx.db
      .query("practiceProfiles")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", args.slpUserId))
      .first();
    const fee = profile?.defaultSessionFee;

    return await ctx.db.insert("billingRecords", {
      patientId: args.patientId,
      slpUserId: args.slpUserId,
      sessionNoteId: args.sessionNoteId,
      dateOfService: args.sessionDate,
      cptCode,
      cptDescription,
      modifiers,
      diagnosisCodes: [],
      placeOfService,
      units: 1,
      fee,
      status: "draft",
      testMetadata: sessionNote?.testMetadata,
    });
  },
});

// ── Queries ────────────────────────────────────────────────────────────────

export const listByPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) return [];
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.slpUserId !== ctx.slpUserId) return [];

    return await ctx.db
      .query("billingRecords")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

export const listBySlp = slpQuery({
  args: {
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("finalized"),
      v.literal("billed")
    )),
  },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) return [];

    if (args.status) {
      return (await ctx.db
        .query("billingRecords")
        .withIndex("by_slpUserId_status", (q) =>
          q.eq("slpUserId", ctx.slpUserId!).eq("status", args.status!)
        )
        .order("desc")
        .collect()
      ).filter((record) => !record.testMetadata);
    }

    return (await ctx.db
      .query("billingRecords")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", ctx.slpUserId!))
      .order("desc")
      .collect()
    ).filter((record) => !record.testMetadata);
  },
});

export const get = slpQuery({
  args: { recordId: v.id("billingRecords") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) return null;
    const record = await ctx.db.get(args.recordId);
    if (!record || record.slpUserId !== ctx.slpUserId) return null;
    return record;
  },
});

export const getUnbilledCount = slpQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.slpUserId) return 0;

    const drafts = await ctx.db
      .query("billingRecords")
      .withIndex("by_slpUserId_status", (q) =>
        q.eq("slpUserId", ctx.slpUserId!).eq("status", "draft")
      )
      .collect();

    const finalized = await ctx.db
      .query("billingRecords")
      .withIndex("by_slpUserId_status", (q) =>
        q.eq("slpUserId", ctx.slpUserId!).eq("status", "finalized")
      )
      .collect();

    return drafts.length + finalized.length;
  },
});

// ── Public Mutations ───────────────────────────────────────────────────────

export const create = slpMutation({
  args: {
    patientId: v.id("patients"),
    dateOfService: v.string(),
    cptCode: v.optional(v.string()),
    cptDescription: v.optional(v.string()),
    modifiers: v.optional(v.array(v.string())),
    diagnosisCodes: v.optional(v.array(v.object({
      code: v.string(),
      description: v.string(),
    }))),
    placeOfService: v.optional(v.string()),
    units: v.optional(v.number()),
    fee: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.dateOfService)) {
      throw new ConvexError("dateOfService must be in YYYY-MM-DD format");
    }

    // Verify the patient belongs to this SLP
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.slpUserId !== ctx.slpUserId) {
      throw new ConvexError("Patient not found or not authorized");
    }

    return await ctx.db.insert("billingRecords", {
      patientId: args.patientId,
      slpUserId: ctx.slpUserId!,
      dateOfService: args.dateOfService,
      cptCode: args.cptCode ?? "92507",
      cptDescription: args.cptDescription ?? "individual speech/language/voice treatment",
      modifiers: args.modifiers ?? ["GP"],
      diagnosisCodes: args.diagnosisCodes ?? [],
      placeOfService: args.placeOfService ?? "11",
      units: args.units ?? 1,
      fee: args.fee,
      notes: args.notes,
      status: "draft",
    });
  },
});

export const update = slpMutation({
  args: {
    recordId: v.id("billingRecords"),
    cptCode: v.optional(v.string()),
    cptDescription: v.optional(v.string()),
    modifiers: v.optional(v.array(v.string())),
    diagnosisCodes: v.optional(v.array(v.object({
      code: v.string(),
      description: v.string(),
    }))),
    placeOfService: v.optional(v.string()),
    units: v.optional(v.number()),
    fee: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) throw new ConvexError("Billing record not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.status !== "draft") {
      throw new ConvexError("Only draft billing records can be edited");
    }

    const updates: Record<string, unknown> = {};
    if (args.cptCode !== undefined) updates.cptCode = args.cptCode;
    if (args.cptDescription !== undefined) updates.cptDescription = args.cptDescription;
    if (args.modifiers !== undefined) updates.modifiers = args.modifiers;
    if (args.diagnosisCodes !== undefined) updates.diagnosisCodes = args.diagnosisCodes;
    if (args.placeOfService !== undefined) updates.placeOfService = args.placeOfService;
    if (args.units !== undefined) updates.units = args.units;
    if (args.fee !== undefined) updates.fee = args.fee;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.recordId, updates);
  },
});

export const finalize = slpMutation({
  args: { recordId: v.id("billingRecords") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) throw new ConvexError("Billing record not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.status !== "draft") {
      throw new ConvexError("Only draft billing records can be finalized");
    }
    await ctx.db.patch(args.recordId, { status: "finalized" });
  },
});

export const markBilled = slpMutation({
  args: { recordId: v.id("billingRecords") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) throw new ConvexError("Billing record not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.status !== "finalized") {
      throw new ConvexError("Only finalized billing records can be marked as billed");
    }
    await ctx.db.patch(args.recordId, { status: "billed", billedAt: Date.now() });
  },
});

export const remove = slpMutation({
  args: { recordId: v.id("billingRecords") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) throw new ConvexError("Billing record not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.status === "billed") {
      throw new ConvexError("Cannot delete a billed billing record");
    }
    await ctx.db.delete(args.recordId);
  },
});
