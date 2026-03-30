import { v } from "convex/values";

import { internalQuery, internalMutation } from "./_generated/server";
import { assertPatientAccess } from "./lib/auth";
import { authedQuery } from "./lib/customFunctions";

export const getByAppointment = authedQuery({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    if (!ctx.userId) return null;

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return null;

    await assertPatientAccess(ctx, appointment.patientId);

    return await ctx.db
      .query("meetingRecords")
      .withIndex("by_appointmentId", (q) => q.eq("appointmentId", args.appointmentId))
      .first();
  },
});

export const getInternal = internalQuery({
  args: { meetingRecordId: v.id("meetingRecords") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.meetingRecordId);
  },
});

const meetingStatusValidator = v.union(
  v.literal("processing"),
  v.literal("transcribing"),
  v.literal("summarizing"),
  v.literal("complete"),
  v.literal("failed")
);

export const updateStatus = internalMutation({
  args: {
    meetingRecordId: v.id("meetingRecords"),
    status: meetingStatusValidator,
    audioFileId: v.optional(v.id("_storage")),
    transcript: v.optional(v.string()),
    transcriptFileId: v.optional(v.id("_storage")),
    aiSummary: v.optional(v.string()),
    soapNoteId: v.optional(v.id("sessionNotes")),
  },
  handler: async (ctx, args) => {
    const { meetingRecordId, status, ...fields } = args;
    const update: Record<string, unknown> = { status };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        update[key] = value;
      }
    }

    await ctx.db.patch(meetingRecordId, update);
  },
});
