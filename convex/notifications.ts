import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import { getAuthUserId } from "./lib/auth";

const notificationTypeValidator = v.union(
  v.literal("session-booked"),
  v.literal("session-cancelled"),
  v.literal("session-reminder"),
  v.literal("session-starting"),
  v.literal("notes-ready")
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) => q.eq("userId", userId).eq("read", false))
      .collect();

    return unread.length;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== userId) return;

    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) => q.eq("userId", userId).eq("read", false))
      .collect();

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
