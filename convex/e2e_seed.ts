import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import {
  createAcceptedCaregiverLinkFixture,
  createPatientFixture,
  createSpeechCoachProgramFixture,
} from "./lib/testFixtures";

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

    const testMetadata = { source: "seed-e2e" as const };

    const patientId = await createPatientFixture(ctx, {
      slpUserId: args.slpUserId,
      firstName: "Test",
      lastName: "Child",
      caregiverEmail: args.caregiverEmail,
      testMetadata,
    });

    await createAcceptedCaregiverLinkFixture(ctx, {
      patientId,
      caregiverUserId: args.caregiverUserId,
      caregiverEmail: args.caregiverEmail,
    });

    await createSpeechCoachProgramFixture(ctx, {
      patientId,
      slpUserId: args.slpUserId,
      testMetadata,
    });

    return { status: "seeded", patientId };
  },
});
