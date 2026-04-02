import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { query } from "./_generated/server";
import { assertCaregiverAccess, assertPatientAccess } from "./lib/auth";
import { authedMutation, authedQuery } from "./lib/customFunctions";

const FORM_TYPE_VALIDATOR = v.union(
  v.literal("hipaa-npp"),
  v.literal("consent-treatment"),
  v.literal("financial-agreement"),
  v.literal("cancellation-policy"),
  v.literal("release-authorization"),
  v.literal("telehealth-consent")
);

const REQUIRED_INTAKE_FORMS = [
  "hipaa-npp",
  "consent-treatment",
  "financial-agreement",
  "cancellation-policy",
] as const;

const FORM_VERSION = "1.0";

// ─── signForm ─────────────────────────────────────────────────────────────────
// Caregivers sign one of the standard intake forms for a linked patient.
// After signing, checks if all 4 required forms are complete and sets
// intakeCompletedAt on the caregiverLinks record.
export const signForm = authedMutation({
  args: {
    patientId: v.id("patients"),
    formType: v.union(
      v.literal("hipaa-npp"),
      v.literal("consent-treatment"),
      v.literal("financial-agreement"),
      v.literal("cancellation-policy"),
      v.literal("release-authorization")
    ),
    signerName: v.string(),
    metadata: v.optional(
      v.object({
        thirdPartyName: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const caregiverUserId = await assertCaregiverAccess(ctx, args.patientId);

    const now = Date.now();

    await ctx.db.insert("intakeForms", {
      patientId: args.patientId,
      caregiverUserId,
      formType: args.formType,
      signedAt: now,
      signerName: args.signerName,
      formVersion: FORM_VERSION,
      metadata: args.metadata,
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: caregiverUserId,
      action: "intake-form-signed",
      details: `Signed ${args.formType}`,
      timestamp: now,
    });

    // Check if all required forms are now complete for this caregiver+patient
    const signedForms = await ctx.db
      .query("intakeForms")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    const signedByCaregiver = new Set(
      signedForms
        .filter((f) => f.caregiverUserId === caregiverUserId)
        .map((f) => f.formType)
    );

    const allRequiredSigned = REQUIRED_INTAKE_FORMS.every((ft) =>
      signedByCaregiver.has(ft)
    );

    if (allRequiredSigned) {
      const link = await ctx.db
        .query("caregiverLinks")
        .withIndex("by_caregiverUserId_patientId", (q) =>
          q.eq("caregiverUserId", caregiverUserId).eq("patientId", args.patientId)
        )
        .first();

      if (link && !link.intakeCompletedAt) {
        await ctx.db.patch(link._id, { intakeCompletedAt: now });
      }
    }
  },
});

// ─── signTelehealthConsent ────────────────────────────────────────────────────
// Idempotent: if the caregiver has already signed, this is a no-op.
export const signTelehealthConsent = authedMutation({
  args: {
    patientId: v.id("patients"),
    signerName: v.string(),
  },
  handler: async (ctx, args) => {
    const caregiverUserId = await assertCaregiverAccess(ctx, args.patientId);

    // Idempotency check
    const existing = await ctx.db
      .query("intakeForms")
      .withIndex("by_patientId_formType", (q) =>
        q.eq("patientId", args.patientId).eq("formType", "telehealth-consent")
      )
      .filter((q) => q.eq(q.field("caregiverUserId"), caregiverUserId))
      .first();

    if (existing) return;

    const now = Date.now();

    await ctx.db.insert("intakeForms", {
      patientId: args.patientId,
      caregiverUserId,
      formType: "telehealth-consent",
      signedAt: now,
      signerName: args.signerName,
      formVersion: FORM_VERSION,
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: caregiverUserId,
      action: "telehealth-consent-signed",
      details: `Signed telehealth consent`,
      timestamp: now,
    });
  },
});

// ─── getByPatient ─────────────────────────────────────────────────────────────
// Returns all intake forms for a patient. Accessible by the SLP or any
// accepted caregiver.
export const getByPatient = authedQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.userId) throw new ConvexError("Not authenticated");

    await assertPatientAccess(ctx, args.patientId);

    return await ctx.db
      .query("intakeForms")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

// ─── getByCaregiver ───────────────────────────────────────────────────────────
// Returns forms signed by the current caregiver for a given patient.
export const getByCaregiver = authedQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.userId) return [];

    await assertCaregiverAccess(ctx, args.patientId);

    const all = await ctx.db
      .query("intakeForms")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    return all.filter((f) => f.caregiverUserId === ctx.userId);
  },
});

// ─── getRequiredProgressByCaregiver ──────────────────────────────────────────
// Returns how many of the 4 required forms the current caregiver has signed
// for the given patient. Returns all-zero defaults if unauthenticated or
// the user does not have caregiver access (soft access check).
export const getRequiredProgressByCaregiver = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { signed: 0, total: REQUIRED_INTAKE_FORMS.length, isComplete: false };
    }

    // Soft access check — return defaults rather than throwing for non-caregivers
    try {
      await assertCaregiverAccess(ctx, args.patientId);
    } catch {
      return { signed: 0, total: REQUIRED_INTAKE_FORMS.length, isComplete: false };
    }

    const allForms = await ctx.db
      .query("intakeForms")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    const signedTypes = new Set(
      allForms
        .filter((form) => form.caregiverUserId === identity.subject)
        .map((form) => form.formType)
    );

    const signedCount = REQUIRED_INTAKE_FORMS.filter((type) => signedTypes.has(type)).length;

    return {
      signed: signedCount,
      total: REQUIRED_INTAKE_FORMS.length,
      isComplete: REQUIRED_INTAKE_FORMS.every((type) => signedTypes.has(type)),
    };
  },
});

// ─── hasTelehealthConsent ─────────────────────────────────────────────────────
// Returns true if the current caregiver has signed the telehealth consent
// for the given patient.
export const hasTelehealthConsent = authedQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.userId) return false;

    await assertCaregiverAccess(ctx, args.patientId);

    const form = await ctx.db
      .query("intakeForms")
      .withIndex("by_patientId_formType", (q) =>
        q.eq("patientId", args.patientId).eq("formType", "telehealth-consent")
      )
      .filter((q) => q.eq(q.field("caregiverUserId"), ctx.userId))
      .first();

    return form !== null;
  },
});
