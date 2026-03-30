import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { authedQuery, slpMutation } from "./lib/customFunctions";

export const assign = slpMutation({
  args: {
    patientId: v.id("patients"),
    sessionId: v.optional(v.id("sessions")),
    appId: v.optional(v.id("apps")),
    notes: v.optional(v.string()),
    goalId: v.optional(v.id("goals")),
    fromGeneration: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const slpUserId = ctx.slpUserId;
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    if (!args.sessionId && !args.appId) {
      throw new ConvexError("Either sessionId or appId must be provided");
    }

    if (args.goalId) {
      const goal = await ctx.db.get(args.goalId);
      if (!goal) throw new ConvexError("Goal not found");
      if (goal.patientId !== args.patientId)
        throw new ConvexError("Goal does not belong to this patient");
      if (goal.slpUserId !== slpUserId)
        throw new ConvexError("Not authorized to use this goal");
    }

    const now = Date.now();
    await ctx.db.insert("patientMaterials", {
      patientId: args.patientId,
      sessionId: args.sessionId,
      appId: args.appId,
      assignedBy: slpUserId,
      assignedAt: now,
      notes: args.notes,
      goalId: args.goalId,
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: slpUserId,
      action: args.fromGeneration ? "material-generated-for-patient" : "material-assigned",
      details: args.notes ?? "Material assigned",
      timestamp: now,
    });
  },
});

export const listByPatient = authedQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.userId) return [];

    const patient = await ctx.db.get(args.patientId);
    if (!patient) return [];
    if (patient.slpUserId !== ctx.userId) {
      const link = await ctx.db
        .query("caregiverLinks")
        .withIndex("by_caregiverUserId_patientId", (q) =>
          q.eq("caregiverUserId", ctx.userId!).eq("patientId", args.patientId)
        )
        .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
        .first();
      if (!link) return [];
    }

    const materials = await ctx.db
      .query("patientMaterials")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .take(200);

    return await Promise.all(
      materials.map(async (m) => {
        let title = "Untitled";
        let type: "session" | "app" = "session";
        if (m.sessionId) {
          const session = await ctx.db.get(m.sessionId);
          if (session) title = session.title;
        } else if (m.appId) {
          const app = await ctx.db.get(m.appId);
          if (app) {
            title = app.title;
            type = "app";
          }
        }
        return { ...m, title, type };
      })
    );
  },
});

export const unassign = slpMutation({
  args: { materialId: v.id("patientMaterials") },
  handler: async (ctx, args) => {
    const slpUserId = ctx.slpUserId;
    const material = await ctx.db.get(args.materialId);
    if (!material) throw new ConvexError("Material not found");

    const patient = await ctx.db.get(material.patientId);
    if (!patient || patient.slpUserId !== slpUserId) {
      throw new ConvexError("Not authorized");
    }

    await ctx.db.delete(args.materialId);
  },
});
