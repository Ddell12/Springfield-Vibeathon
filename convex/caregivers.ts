import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { getAuthUserId, getAuthRole, assertSLP } from "./lib/auth";

function generateInviteToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function validateEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ConvexError("Invalid email format");
  }
  return normalized;
}

export const createInvite = mutation({
  args: {
    patientId: v.id("patients"),
    email: v.string(),
    relationship: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    const email = validateEmail(args.email);
    const inviteToken = generateInviteToken();

    await ctx.db.insert("caregiverLinks", {
      patientId: args.patientId,
      email,
      inviteToken,
      inviteStatus: "pending",
      relationship: args.relationship,
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: slpUserId,
      action: "invite-sent",
      details: `Invited ${email}`,
      timestamp: Date.now(),
    });

    return inviteToken;
  },
});

export const getInvite = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", args.token))
      .first();

    if (!link || link.inviteStatus !== "pending") return null;

    const patient = await ctx.db.get(link.patientId);
    if (!patient) return null;

    return {
      patientFirstName: patient.firstName,
      inviteStatus: link.inviteStatus,
    };
  },
});

export const acceptInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Prevent SLPs from accepting caregiver invites
    const role = await getAuthRole(ctx);
    if (role === "slp" || role === null) {
      const ownsPatients = await ctx.db
        .query("patients")
        .withIndex("by_slpUserId", (q) => q.eq("slpUserId", userId))
        .first();
      if (ownsPatients) {
        throw new ConvexError("Therapists cannot accept caregiver invites. Please use a separate account.");
      }
    }

    // Convex mutations run with serializable isolation — concurrent calls
    // are serialized per-document, so only one can pass the status checks.
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", args.token))
      .first();

    if (!link) throw new ConvexError("Invalid invite token");

    if (link.inviteStatus === "accepted" && link.caregiverUserId === userId) {
      return;
    }

    if (link.inviteStatus === "accepted" && link.caregiverUserId !== userId) {
      throw new ConvexError("This invite has already been used");
    }

    if (link.inviteStatus === "revoked") {
      throw new ConvexError("This invite has been revoked");
    }

    await ctx.db.patch(link._id, {
      caregiverUserId: userId,
      inviteStatus: "accepted",
    });

    await ctx.db.insert("activityLog", {
      patientId: link.patientId,
      actorUserId: userId,
      action: "invite-accepted",
      details: `Caregiver accepted invite`,
      timestamp: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.clerkActions.setCaregiverRole, {
      userId,
    });
  },
});

export const revokeInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);

    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", args.token))
      .first();

    if (!link) throw new ConvexError("Invalid invite token");

    const patient = await ctx.db.get(link.patientId);
    if (!patient || patient.slpUserId !== slpUserId) {
      throw new ConvexError("Not authorized");
    }

    await ctx.db.patch(link._id, { inviteStatus: "revoked" });
  },
});

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const patient = await ctx.db.get(args.patientId);
    if (!patient) return [];
    if (patient.slpUserId !== userId) {
      const link = await ctx.db
        .query("caregiverLinks")
        .withIndex("by_caregiverUserId_patientId", (q) =>
          q.eq("caregiverUserId", userId).eq("patientId", args.patientId)
        )
        .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
        .first();
      if (!link) return [];
    }

    const links = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .take(50);
    return links.map(({ inviteToken, ...rest }) => rest);
  },
});

export const listByCaregiver = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const links = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId", (q) => q.eq("caregiverUserId", userId))
      .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
      .take(50);

    return links;
  },
});
