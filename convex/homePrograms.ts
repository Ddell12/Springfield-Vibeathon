import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { assertSLP, assertPatientAccess } from "./lib/auth";

// ── Validators ──────────────────────────────────────────────────────────────

const frequencyValidator = v.union(
  v.literal("daily"),
  v.literal("3x-week"),
  v.literal("weekly"),
  v.literal("as-needed")
);

const statusValidator = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed")
);

// ── Validation Helpers ──────────────────────────────────────────────────────

function validateProgramFields(args: {
  title?: string;
  instructions?: string;
  startDate?: string;
  endDate?: string;
}): void {
  if (args.title !== undefined) {
    const title = args.title.trim();
    if (title.length === 0 || title.length > 200) {
      throw new ConvexError("Title must be 1-200 characters");
    }
  }
  if (args.instructions !== undefined) {
    const instructions = args.instructions.trim();
    if (instructions.length === 0 || instructions.length > 2000) {
      throw new ConvexError("Instructions must be 1-2000 characters");
    }
  }
  if (args.startDate !== undefined) {
    const date = new Date(args.startDate);
    if (isNaN(date.getTime())) {
      throw new ConvexError("Invalid start date");
    }
  }
  if (args.endDate !== undefined) {
    const date = new Date(args.endDate);
    if (isNaN(date.getTime())) {
      throw new ConvexError("Invalid end date");
    }
  }
}

// ── Queries ─────────────────────────────────────────────────────────────────

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);
    return await ctx.db
      .query("homePrograms")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .take(100);
  },
});

export const getActiveByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);
    return await ctx.db
      .query("homePrograms")
      .withIndex("by_patientId_status", (q) =>
        q.eq("patientId", args.patientId).eq("status", "active")
      )
      .take(100);
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    patientId: v.id("patients"),
    title: v.string(),
    instructions: v.string(),
    materialId: v.optional(v.id("patientMaterials")),
    goalId: v.optional(v.id("goals")),
    frequency: frequencyValidator,
    startDate: v.string(),
    endDate: v.optional(v.string()),
    type: v.optional(v.union(v.literal("standard"), v.literal("speech-coach"))),
    speechCoachConfig: v.optional(v.object({
      targetSounds: v.array(v.string()),
      ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
      defaultDurationMinutes: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    validateProgramFields({
      title: args.title,
      instructions: args.instructions,
      startDate: args.startDate,
      endDate: args.endDate,
    });

    // Speech coach type validation
    const programType = args.type;
    if (programType === "speech-coach" && !args.speechCoachConfig) {
      throw new ConvexError("speechCoachConfig is required for speech-coach type");
    }
    if (programType !== "speech-coach" && args.speechCoachConfig) {
      throw new ConvexError("speechCoachConfig is only valid for speech-coach type");
    }

    const programId = await ctx.db.insert("homePrograms", {
      patientId: args.patientId,
      slpUserId,
      title: args.title.trim(),
      instructions: args.instructions.trim(),
      materialId: args.materialId,
      goalId: args.goalId,
      frequency: args.frequency,
      status: "active",
      startDate: args.startDate,
      endDate: args.endDate,
      type: programType,
      speechCoachConfig: args.speechCoachConfig,
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: slpUserId,
      action: "home-program-assigned",
      details: `Home program assigned: ${args.title.trim()}`,
      timestamp: Date.now(),
    });

    return programId;
  },
});

export const update = mutation({
  args: {
    id: v.id("homePrograms"),
    title: v.optional(v.string()),
    instructions: v.optional(v.string()),
    frequency: v.optional(frequencyValidator),
    status: v.optional(statusValidator),
    endDate: v.optional(v.string()),
    speechCoachConfig: v.optional(v.object({
      targetSounds: v.array(v.string()),
      ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
      defaultDurationMinutes: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const program = await ctx.db.get(args.id);
    if (!program) throw new ConvexError("Home program not found");

    const patient = await ctx.db.get(program.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    validateProgramFields({
      title: args.title,
      instructions: args.instructions,
      endDate: args.endDate,
    });

    if (args.speechCoachConfig && program.type !== "speech-coach") {
      throw new ConvexError("speechCoachConfig is only valid for speech-coach type");
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title.trim();
    if (args.instructions !== undefined) updates.instructions = args.instructions.trim();
    if (args.frequency !== undefined) updates.frequency = args.frequency;
    if (args.status !== undefined) updates.status = args.status;
    if (args.endDate !== undefined) updates.endDate = args.endDate;
    if (args.speechCoachConfig !== undefined) updates.speechCoachConfig = args.speechCoachConfig;

    await ctx.db.patch(args.id, updates);
  },
});
