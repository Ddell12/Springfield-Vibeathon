import { afterAll, beforeAll } from "vitest";

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
