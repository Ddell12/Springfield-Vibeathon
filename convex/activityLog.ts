import { ConvexError, v } from "convex/values";

import { internalMutation, query } from "./_generated/server";
import { getAuthUserId } from "./lib/auth";

export const log = internalMutation({
  args: {
    patientId: v.id("patients"),
    actorUserId: v.string(),
    action: v.union(
      v.literal("patient-created"),
      v.literal("profile-updated"),
      v.literal("material-assigned"),
      v.literal("invite-sent"),
      v.literal("invite-accepted"),
      v.literal("status-changed"),
      v.literal("session-documented"),
      v.literal("session-signed"),
      v.literal("session-unsigned")
    ),
    details: v.optional(v.string()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activityLog", args);
  },
});

export const listByPatient = query({
  args: {
    patientId: v.id("patients"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Check access: must be the owning SLP or a linked caregiver
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");

    const isSLP = patient.slpUserId === userId;
    if (!isSLP) {
      const link = await ctx.db
        .query("caregiverLinks")
        .withIndex("by_caregiverUserId_patientId", (q) =>
          q.eq("caregiverUserId", userId).eq("patientId", args.patientId))
        .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
        .first();
      if (!link) throw new ConvexError("Not authorized");
    }

    const limit = args.limit ?? 20;
    return await ctx.db
      .query("activityLog")
      .withIndex("by_patientId_timestamp", (q) =>
        q.eq("patientId", args.patientId)
      )
      .order("desc")
      .take(limit);
  },
});
