import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

/** Seed a patient + accepted caregiver link for E2E testing.
 *  Run via: npx convex run e2e_seed:seedTestCaregiverLink \
 *    '{"slpUserId":"...","caregiverUserId":"...","caregiverEmail":"e2e+clerk_test+caregiver@bridges.ai"}' */
export const seedTestCaregiverLink = internalMutation({
  args: {
    slpUserId: v.string(),
    caregiverUserId: v.string(),
    caregiverEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Idempotent: skip if caregiver already has a linked patient
    const existing = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId", (q) =>
        q.eq("caregiverUserId", args.caregiverUserId)
      )
      .first();
    if (existing) {
      return { status: "skipped", reason: "Caregiver link already exists" };
    }

    // 1. Create test patient owned by SLP
    const patientId = await ctx.db.insert("patients", {
      slpUserId: args.slpUserId,
      firstName: "Test",
      lastName: "Child",
      dateOfBirth: "2020-01-01",
      diagnosis: "articulation",
      status: "active",
      communicationLevel: "single-words",
      interests: ["dinosaurs", "bubbles"],
    });

    // 2. Create accepted caregiver link
    await ctx.db.insert("caregiverLinks", {
      patientId,
      caregiverUserId: args.caregiverUserId,
      email: args.caregiverEmail,
      inviteToken: "e2e-test-token-00000000",
      inviteStatus: "accepted",
      relationship: "parent",
    });

    // 3. Create speech coach home program so Speech Coach is testable
    await ctx.db.insert("homePrograms", {
      patientId,
      slpUserId: args.slpUserId,
      title: "Speech Coach — /s/ sounds",
      instructions: "Practice initial and final /s/ sounds with the speech coach. Focus on clear production.",
      frequency: "daily",
      status: "active",
      startDate: "2026-03-01",
      type: "speech-coach",
      speechCoachConfig: {
        targetSounds: ["s"],
        ageRange: "5-7",
        defaultDurationMinutes: 5,
      },
    });

    return { status: "seeded", patientId };
  },
});
