import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertPatientAccess } from "./lib/auth";

export const assign = mutation({
  args: {
    patientId: v.id("patients"),
    appId: v.id("apps"),
    label: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, role } = await assertPatientAccess(ctx, args.patientId);

    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App not found");

    const existing = await ctx.db
      .query("childApps")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
    if (existing.some((e) => e.appId === args.appId)) {
      throw new Error("App already assigned to this child");
    }

    return await ctx.db.insert("childApps", {
      patientId: args.patientId,
      appId: args.appId,
      assignedBy: userId,
      assignedByRole: role,
      label: args.label,
      sortOrder: args.sortOrder,
    });
  },
});

export const remove = mutation({
  args: { childAppId: v.id("childApps") },
  handler: async (ctx, args) => {
    const childApp = await ctx.db.get(args.childAppId);
    if (!childApp) throw new Error("Assignment not found");
    await assertPatientAccess(ctx, childApp.patientId);
    await ctx.db.delete(args.childAppId);
  },
});

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);
    const assignments = await ctx.db
      .query("childApps")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    const enriched = await Promise.all(
      assignments.map(async (a) => {
        const app = await ctx.db.get(a.appId);
        return {
          ...a,
          appTitle: app?.title ?? "Untitled",
          appDescription: app?.description ?? "",
        };
      })
    );
    return enriched;
  },
});

export const getBundleForApp = query({
  args: {
    patientId: v.id("patients"),
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    const assignments = await ctx.db
      .query("childApps")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
    if (!assignments.some((a) => a.appId === args.appId)) return null;

    const app = await ctx.db.get(args.appId);
    if (!app?.sessionId) return null;

    const file = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", app.sessionId!).eq("path", "_bundle.html")
      )
      .first();
    return file?.contents ?? null;
  },
});
