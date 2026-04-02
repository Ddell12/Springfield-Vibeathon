import { internalMutation } from "./_generated/server";

export const sweepExpiredRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // .take(100) batch limit is intentional — this sweep targets a developer-population
    // of test records, not production data. Full table scans are avoided by design.

    // Sweep child records first to avoid orphaned references.

    // 1. billingRecords
    const billingRecords = await ctx.db.query("billingRecords").take(100);
    for (const record of billingRecords) {
      if (
        record.testMetadata?.expiresAt &&
        record.testMetadata.expiresAt < now
      ) {
        await ctx.db.delete(record._id);
      }
    }

    // 2. sessionNotes
    const sessionNotes = await ctx.db.query("sessionNotes").take(100);
    for (const note of sessionNotes) {
      if (
        note.testMetadata?.expiresAt &&
        note.testMetadata.expiresAt < now
      ) {
        await ctx.db.delete(note._id);
      }
    }

    // 3. meetingRecords
    const meetingRecords = await ctx.db.query("meetingRecords").take(100);
    for (const record of meetingRecords) {
      if (
        record.testMetadata?.expiresAt &&
        record.testMetadata.expiresAt < now
      ) {
        await ctx.db.delete(record._id);
      }
    }

    // 4. appointments
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .take(100);

    for (const appointment of appointments) {
      if (
        appointment.testMetadata?.expiresAt &&
        appointment.testMetadata.expiresAt < now
      ) {
        await ctx.db.delete(appointment._id);
      }
    }

    // 5. patients (parent records last)
    const patients = await ctx.db.query("patients").take(100);
    for (const patient of patients) {
      if (
        patient.testMetadata?.expiresAt &&
        patient.testMetadata.expiresAt < now
      ) {
        await ctx.db.delete(patient._id);
      }
    }
  },
});
