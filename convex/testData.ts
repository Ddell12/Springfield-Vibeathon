import { internalMutation } from "./_generated/server";

export const sweepExpiredRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

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
