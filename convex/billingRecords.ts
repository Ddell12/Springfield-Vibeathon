import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { slpQuery } from "./lib/customFunctions";

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
