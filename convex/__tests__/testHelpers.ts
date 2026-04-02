import { afterAll, beforeAll } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

/**
 * Suppress "Write outside of transaction" unhandled rejections from convex-test.
 *
 * The acceptInvite mutation schedules clerkActions.setCaregiverRole via
 * ctx.scheduler.runAfter, which convex-test cannot execute (it tries to write
 * to _scheduled_functions outside the transaction boundary). This is expected
 * noise — the actual Clerk API call only runs in the real Convex runtime.
 *
 * Call this at the top level of any test file that uses acceptInvite.
 */
export function suppressSchedulerErrors() {
  function onUnhandledRejection(reason: unknown) {
    if (
      reason instanceof Error &&
      reason.message.includes("Write outside of transaction")
    ) {
      // Silently swallow — this is expected convex-test scheduler noise
      return;
    }
    // Re-throw non-scheduler rejections so real errors aren't hidden
    throw reason;
  }

  beforeAll(() => {
    process.on("unhandledRejection", onUnhandledRejection);
  });
  afterAll(() => {
    process.removeListener("unhandledRejection", onUnhandledRejection);
  });
}

/**
 * Creates a complete speech coach fixture: SLP patient + accepted caregiver link + home program.
 * Reusable across unit tests, demo seeds, and E2E seeds.
 */
export async function createSpeechCoachFixture(
  t: ReturnType<typeof convexTest>,
  args: {
    slpIdentity: { subject: string; issuer: string; [key: string]: string };
    caregiverIdentity: { subject: string; issuer: string; [key: string]: string };
  },
): Promise<{ patientId: Id<"patients">; programId: Id<"homePrograms"> }> {
  const slp = t.withIdentity(args.slpIdentity);
  const { patientId, inviteToken } = await slp.mutation(api.patients.create, {
    firstName: "Alex",
    lastName: "Smith",
    dateOfBirth: "2020-01-15",
    diagnosis: "articulation",
    parentEmail: "parent@test.com",
  });

  const caregiver = t.withIdentity(args.caregiverIdentity);
  await caregiver.mutation(api.caregivers.acceptInvite, { token: inviteToken! });

  const today = new Date().toISOString().slice(0, 10);
  const programId = await slp.mutation(api.homePrograms.create, {
    patientId,
    title: "Speech Coach - /s/ sounds",
    instructions: "Practice /s/ sounds with the voice coach.",
    frequency: "daily" as const,
    startDate: today,
    type: "speech-coach",
    speechCoachConfig: {
      targetSounds: ["/s/"],
      ageRange: "2-4" as const,
      defaultDurationMinutes: 5,
    },
  });

  return { patientId, programId };
}

/**
 * Creates a minimal test patient directly via ctx.db.insert.
 * Reusable across unit tests that need a patient record without a full SLP/caregiver flow.
 *
 * **Unit tests only.** This helper uses `t.run()` from convex-test and cannot be
 * called inside a Convex mutation. For fixtures needed within mutations (e.g. in
 * `convex/lib/testFixtures.ts` seed scripts), use `createPatientFixture` from
 * `lib/testFixtures.ts` instead.
 */
export async function createTestPatient(
  t: ReturnType<typeof convexTest>,
  args: {
    slpUserId?: string;
    testMetadata?: {
      source: "developer-shortcut" | "seed-demo" | "seed-e2e";
      createdByUserId?: string;
      expiresAt?: number;
    };
  } = {},
): Promise<Id<"patients">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("patients", {
      slpUserId: args.slpUserId ?? "slp-user-123",
      firstName: "Alex",
      lastName: "Smith",
      dateOfBirth: "2020-01-15",
      diagnosis: "articulation",
      status: "active",
      testMetadata: args.testMetadata,
    });
  });
}
