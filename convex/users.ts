import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const updateName = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, { name: args.name });
  },
});

export const setCaregiverRole = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const id = args.userId as Id<"users">;
    const user = await ctx.db.get(id);
    if (!user) throw new Error(`User not found: ${args.userId}`);
    if (user.role) {
      console.warn(
        `Skipping setCaregiverRole: user ${args.userId} already has role "${user.role}"`
      );
      return;
    }
    await ctx.db.patch(id, { role: "caregiver" });
  },
});

export const setUserRole = internalMutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal("slp"), v.literal("caregiver")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId as Id<"users">, { role: args.role });
  },
});

export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
  },
});

export const getRoleById = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId as Id<"users">);
    return user?.role ?? null;
  },
});
