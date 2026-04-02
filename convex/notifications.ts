import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { authedMutation, authedQuery } from "./lib/customFunctions";

const notificationTypeValidator = v.union(
  v.literal("session-booked"),
  v.literal("session-cancelled"),
  v.literal("session-reminder"),
  v.literal("session-starting"),
  v.literal("notes-ready")
);

export const list = authedQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.userId) return [];

    return await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.userId!))
      .order("desc")
      .take(50);
  },
});

export const unreadCount = authedQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.userId) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) => q.eq("userId", ctx.userId!).eq("read", false))
      .take(100);

    return unread.length;
  },
});

export const markRead = authedMutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== ctx.userId) return;

    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllRead = authedMutation({
  args: {},
  handler: async (ctx) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) => q.eq("userId", ctx.userId).eq("read", false))
      .take(100);

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
  },
});

export const createNotification = internalMutation({
  args: {
    userId: v.string(),
    type: notificationTypeValidator,
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),
    appointmentId: v.optional(v.id("appointments")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      body: args.body,
      link: args.link,
      read: false,
      appointmentId: args.appointmentId,
    });
  },
});
