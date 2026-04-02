import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { TestMetadata } from "./testMetadata";

export async function createPatientFixture(
  ctx: MutationCtx,
  args: {
    slpUserId: string;
    firstName: string;
    lastName: string;
    caregiverEmail?: string;
    testMetadata?: TestMetadata;
  },
): Promise<Id<"patients">> {
  return await ctx.db.insert("patients", {
    slpUserId: args.slpUserId,
    firstName: args.firstName,
    lastName: args.lastName,
    dateOfBirth: "2020-01-01",
    diagnosis: "articulation",
    status: "active",
    parentEmail: args.caregiverEmail,
    testMetadata: args.testMetadata,
  });
}

export async function createAcceptedCaregiverLinkFixture(
  ctx: MutationCtx,
  args: {
    patientId: Id<"patients">;
    caregiverUserId: string;
    caregiverEmail: string;
  },
): Promise<void> {
  await ctx.db.insert("caregiverLinks", {
    patientId: args.patientId,
    caregiverUserId: args.caregiverUserId,
    email: args.caregiverEmail,
    inviteToken: `e2e-${args.caregiverUserId}-${Date.now()}`,
    inviteStatus: "accepted",
    relationship: "parent",
  });
}

export async function createSpeechCoachProgramFixture(
  ctx: MutationCtx,
  args: {
    patientId: Id<"patients">;
    slpUserId: string;
  },
): Promise<Id<"homePrograms">> {
  return await ctx.db.insert("homePrograms", {
    patientId: args.patientId,
    slpUserId: args.slpUserId,
    title: "Speech Coach — /s/ sounds",
    instructions: "Practice /s/ sounds with the speech coach.",
    frequency: "daily",
    status: "active",
    startDate: "2026-04-01",
    type: "speech-coach",
    speechCoachConfig: {
      targetSounds: ["/s/"],
      ageRange: "5-7",
      defaultDurationMinutes: 5,
    },
  });
}
