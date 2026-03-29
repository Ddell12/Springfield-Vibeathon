import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertCaregiverAccess, assertPatientAccess } from "./lib/auth";

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

/** Simple hash for PIN. Threat model: child-proofing, not security. */
function hashPIN(pin: string): string {
  const salted = `bridges-kid-mode:${pin}`;
  let hash = 5381;
  for (let i = 0; i < salted.length; i++) {
    hash = ((hash << 5) + hash + salted.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

export const setPIN = mutation({
  args: {
    patientId: v.id("patients"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    await assertCaregiverAccess(ctx, args.patientId);
    if (args.pin.length !== 4 || !/^\d{4}$/.test(args.pin)) {
      throw new Error("PIN must be exactly 4 digits");
    }

    const hashed = hashPIN(args.pin);

    const userId = (await ctx.auth.getUserIdentity())!.subject;
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", userId).eq("patientId", args.patientId)
      )
      .first();
    if (!link) throw new Error("Caregiver link not found");

    await ctx.db.patch(link._id, { kidModePIN: hashed });
  },
});

/** Mutation (not query) because hash computation should not run in reactive queries. */
export const verifyPIN = mutation({
  args: {
    patientId: v.id("patients"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    const userId = (await ctx.auth.getUserIdentity())!.subject;
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", userId).eq("patientId", args.patientId)
      )
      .first();
    if (!link?.kidModePIN) return false;

    const hashed = hashPIN(args.pin);
    return hashed === link.kidModePIN;
  },
});

export const hasPIN = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    const userId = (await ctx.auth.getUserIdentity())!.subject;
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", userId).eq("patientId", args.patientId)
      )
      .first();
    return !!link?.kidModePIN;
  },
});
