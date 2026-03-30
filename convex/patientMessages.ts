import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertPatientAccess } from "./lib/auth";

export const send = mutation({
  args: {
    patientId: v.id("patients"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, role } = await assertPatientAccess(ctx, args.patientId);

    const trimmed = args.content.trim();
    if (trimmed.length < 1 || trimmed.length > 5000) {
      throw new ConvexError("Message content must be between 1 and 5000 characters");
    }

    const messageId = await ctx.db.insert("patientMessages", {
      patientId: args.patientId,
      senderUserId: userId,
      senderRole: role,
      content: trimmed,
      timestamp: Date.now(),
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: userId,
      action: "message-sent",
      timestamp: Date.now(),
    });

    return messageId;
  },
});

export const list = query({
  args: {
    patientId: v.id("patients"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    const limit = args.limit ?? 50;
    return await ctx.db
      .query("patientMessages")
      .withIndex("by_patientId_timestamp", (q) =>
        q.eq("patientId", args.patientId)
      )
      .order("desc")
      .take(limit);
  },
});

export const markRead = mutation({
  args: {
    messageId: v.id("patientMessages"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new ConvexError("Message not found");

    const { userId } = await assertPatientAccess(ctx, message.patientId);

    if (message.senderUserId === userId) {
      throw new ConvexError("Cannot mark your own message as read");
    }

    await ctx.db.patch(args.messageId, { readAt: Date.now() });
  },
});

export const getUnreadCount = query({
  args: {
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertPatientAccess(ctx, args.patientId);

    // TODO(perf): For scale, denormalize into a counter on caregiverLinks.
    // Current approach is fine for <100 messages per patient.
    const unread = await ctx.db
      .query("patientMessages")
      .withIndex("by_patientId_timestamp", (q) =>
        q.eq("patientId", args.patientId)
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("senderUserId"), userId),
          q.eq(q.field("readAt"), undefined)
        )
      )
      .take(1000);
    return unread.length;
  },
});
