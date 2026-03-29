import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { getAuthUserId, assertSLP } from "./lib/auth";

const diagnosisValidator = v.union(
  v.literal("articulation"),
  v.literal("language"),
  v.literal("fluency"),
  v.literal("voice"),
  v.literal("aac-complex"),
  v.literal("other")
);

const statusValidator = v.union(
  v.literal("active"),
  v.literal("on-hold"),
  v.literal("discharged"),
  v.literal("pending-intake")
);

const communicationLevelValidator = v.optional(
  v.union(
    v.literal("pre-verbal"),
    v.literal("single-words"),
    v.literal("phrases"),
    v.literal("sentences")
  )
);

function validateName(name: string, field: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new ConvexError(`${field} is required`);
  if (trimmed.length > 100) throw new ConvexError(`${field} must be 100 characters or less`);
  return trimmed;
}

function validateDateOfBirth(dob: string): void {
  const date = new Date(dob);
  if (isNaN(date.getTime())) throw new ConvexError("Invalid date of birth");
  const now = new Date();
  if (date >= now) throw new ConvexError("Date of birth must be in the past");
  const twentyOneYearsAgo = new Date();
  twentyOneYearsAgo.setFullYear(twentyOneYearsAgo.getFullYear() - 21);
  if (date < twentyOneYearsAgo) throw new ConvexError("Date of birth must be within the last 21 years");
}

function validateEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ConvexError("Invalid email format");
  }
  return normalized;
}

function generateInviteToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const list = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (args.status) {
      return await ctx.db
        .query("patients")
        .withIndex("by_slpUserId_status", (q) =>
          q.eq("slpUserId", userId).eq("status", args.status as "active" | "on-hold" | "discharged" | "pending-intake")
        )
        .take(500);
    }
    return await ctx.db
      .query("patients")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", userId))
      .take(500);
  },
});

export const get = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const patient = await ctx.db.get(args.patientId);
    if (!patient) return null;

    if (patient.slpUserId === userId) return patient;

    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", userId).eq("patientId", args.patientId)
      )
      .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
      .first();
    if (link) return patient;

    throw new ConvexError("Not authorized");
  },
});

export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    diagnosis: diagnosisValidator,
    status: v.optional(statusValidator),
    parentEmail: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    communicationLevel: communicationLevelValidator,
    sensoryNotes: v.optional(v.string()),
    behavioralNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);

    const firstName = validateName(args.firstName, "First name");
    const lastName = validateName(args.lastName, "Last name");
    validateDateOfBirth(args.dateOfBirth);

    if (args.interests && args.interests.length > 20) {
      throw new ConvexError("Maximum 20 interests allowed");
    }
    if (args.interests?.some((i) => i.length > 50)) {
      throw new ConvexError("Each interest must be 50 characters or less");
    }

    const patientId = await ctx.db.insert("patients", {
      slpUserId,
      firstName,
      lastName,
      dateOfBirth: args.dateOfBirth,
      diagnosis: args.diagnosis,
      status: args.status ?? "active",
      parentEmail: args.parentEmail ? validateEmail(args.parentEmail) : undefined,
      interests: args.interests,
      communicationLevel: args.communicationLevel,
      sensoryNotes: args.sensoryNotes,
      behavioralNotes: args.behavioralNotes,
      notes: args.notes,
    });

    const now = Date.now();

    await ctx.db.insert("activityLog", {
      patientId,
      actorUserId: slpUserId,
      action: "patient-created",
      details: `Created patient ${firstName} ${lastName}`,
      timestamp: now,
    });

    let inviteToken: string | undefined;
    if (args.parentEmail) {
      inviteToken = generateInviteToken();
      await ctx.db.insert("caregiverLinks", {
        patientId,
        email: validateEmail(args.parentEmail),
        inviteToken,
        inviteStatus: "pending",
      });
      await ctx.db.insert("activityLog", {
        patientId,
        actorUserId: slpUserId,
        action: "invite-sent",
        details: `Invited ${args.parentEmail}`,
        timestamp: now + 1,
      });
    }

    return { patientId, inviteToken };
  },
});

export const update = mutation({
  args: {
    patientId: v.id("patients"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    diagnosis: v.optional(diagnosisValidator),
    parentEmail: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    communicationLevel: communicationLevelValidator,
    sensoryNotes: v.optional(v.string()),
    behavioralNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    const updates: Record<string, unknown> = {};
    if (args.firstName !== undefined) updates.firstName = validateName(args.firstName, "First name");
    if (args.lastName !== undefined) updates.lastName = validateName(args.lastName, "Last name");
    if (args.dateOfBirth !== undefined) {
      validateDateOfBirth(args.dateOfBirth);
      updates.dateOfBirth = args.dateOfBirth;
    }
    if (args.diagnosis !== undefined) updates.diagnosis = args.diagnosis;
    if (args.parentEmail !== undefined) updates.parentEmail = validateEmail(args.parentEmail);
    if (args.interests !== undefined) {
      if (args.interests.length > 20) throw new ConvexError("Maximum 20 interests allowed");
      if (args.interests.some((i) => i.length > 50)) throw new ConvexError("Each interest must be 50 characters or less");
      updates.interests = args.interests;
    }
    if (args.communicationLevel !== undefined) updates.communicationLevel = args.communicationLevel;
    if (args.sensoryNotes !== undefined) updates.sensoryNotes = args.sensoryNotes;
    if (args.behavioralNotes !== undefined) updates.behavioralNotes = args.behavioralNotes;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.patientId, updates);

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: slpUserId,
      action: "profile-updated",
      details: `Updated: ${Object.keys(updates).join(", ")}`,
      timestamp: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    patientId: v.id("patients"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    const oldStatus = patient.status;
    await ctx.db.patch(args.patientId, { status: args.status });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: slpUserId,
      action: "status-changed",
      details: `${oldStatus} → ${args.status}`,
      timestamp: Date.now(),
    });
  },
});

/** Returns just the patient's first name without auth. Used by the PWA manifest
 *  route handler which runs server-side without a user session. */
export const getPublicFirstName = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    return patient?.firstName ?? null;
  },
});

/** Soft-fail variant of get — returns null instead of throwing when unauthorized. */
export const getForPlay = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const patient = await ctx.db.get(args.patientId);
    if (!patient) return null;
    if (patient.slpUserId === userId) return patient;
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", userId).eq("patientId", args.patientId)
      )
      .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
      .first();
    if (link) return patient;
    return null;
  },
});

export const getForContext = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    const patient = await ctx.db.get(patientId);
    if (!patient) return null;
    if (patient.slpUserId !== identity.subject) return null;
    return {
      firstName: patient.firstName,
      diagnosis: patient.diagnosis,
      communicationLevel: patient.communicationLevel,
      interests: patient.interests,
      sensoryNotes: patient.sensoryNotes,
      behavioralNotes: patient.behavioralNotes,
    };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { active: 0, onHold: 0, discharged: 0, pendingIntake: 0 };

    const statuses = ["active", "on-hold", "discharged", "pending-intake"] as const;
    const counts = await Promise.all(
      statuses.map(async (status) => {
        const results = await ctx.db
          .query("patients")
          .withIndex("by_slpUserId_status", (q) =>
            q.eq("slpUserId", userId).eq("status", status)
          )
          .collect();
        return results.length;
      })
    );
    return {
      active: counts[0],
      onHold: counts[1],
      discharged: counts[2],
      pendingIntake: counts[3],
    };
  },
});
