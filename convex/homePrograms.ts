import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { query } from "./_generated/server";
import { assertPatientAccess } from "./lib/auth";
import { slpMutation } from "./lib/customFunctions";

// ── Validators ──────────────────────────────────────────────────────────────

// Used by assignSpeechCoachTemplate (added in Task 2) and future homePrograms schema extension.
export const childSpeechCoachOverrideValidator = v.object({
  assignedTemplateId: v.optional(v.id("speechCoachTemplates")),
  lastSyncedTemplateVersion: v.optional(v.number()),
  targetSounds: v.array(v.string()),
  ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
  defaultDurationMinutes: v.number(),
  preferredThemes: v.array(v.string()),
  avoidThemes: v.array(v.string()),
  childNotes: v.optional(v.string()),
  promptAddendum: v.optional(v.string()),
});

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

const speechCoachConfigValidator = v.object({
  targetSounds: v.array(v.string()),
  ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
  defaultDurationMinutes: v.number(),
  coachSetup: v.optional(v.object({
    targetPositions: v.array(v.union(
      v.literal("initial"),
      v.literal("medial"),
      v.literal("final"),
      v.literal("blend")
    )),
    sessionGoal: v.union(
      v.literal("drill"),
      v.literal("mixed"),
      v.literal("carryover"),
      v.literal("listening")
    ),
    coachTone: v.union(
      v.literal("playful"),
      v.literal("calm"),
      v.literal("energetic"),
      v.literal("neutral")
    ),
    sessionPace: v.union(
      v.literal("slow"),
      v.literal("steady"),
      v.literal("brisk")
    ),
    promptStyle: v.union(
      v.literal("model-first"),
      v.literal("ask-first"),
      v.literal("choice-based"),
      v.literal("imitation-heavy")
    ),
    correctionStyle: v.union(
      v.literal("recast"),
      v.literal("gentle-direct"),
      v.literal("explicit")
    ),
    maxRetriesPerWord: v.union(v.literal(1), v.literal(2), v.literal(3)),
    frustrationSupport: v.union(
      v.literal("back-off-fast"),
      v.literal("balanced"),
      v.literal("keep-challenge")
    ),
    preferredThemes: v.array(v.string()),
    avoidThemes: v.array(v.string()),
    slpNotes: v.optional(v.string()),
  })),
});

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

export const create = slpMutation({
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
    speechCoachConfig: v.optional(speechCoachConfigValidator),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

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
      slpUserId: ctx.slpUserId,
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
      actorUserId: ctx.slpUserId,
      action: "home-program-assigned",
      details: `Home program assigned: ${args.title.trim()}`,
      timestamp: Date.now(),
    });

    return programId;
  },
});

export const assignSpeechCoachTemplate = slpMutation({
  args: {
    id: v.id("homePrograms"),
    assignedTemplateId: v.id("speechCoachTemplates"),
    childOverrides: childSpeechCoachOverrideValidator,
  },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.id);
    if (!program) throw new ConvexError("Home program not found");

    const template = await ctx.db.get(args.assignedTemplateId);
    if (!template || template.slpUserId !== ctx.slpUserId) {
      throw new ConvexError("Template not found");
    }

    await ctx.db.patch(args.id, {
      speechCoachConfig: {
        ...program.speechCoachConfig,
        assignedTemplateId: args.assignedTemplateId,
        lastSyncedTemplateVersion: template.version,
        childOverrides: args.childOverrides,
      },
    });
  },
});

export const update = slpMutation({
  args: {
    id: v.id("homePrograms"),
    title: v.optional(v.string()),
    instructions: v.optional(v.string()),
    frequency: v.optional(frequencyValidator),
    status: v.optional(statusValidator),
    endDate: v.optional(v.string()),
    speechCoachConfig: v.optional(speechCoachConfigValidator),
  },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.id);
    if (!program) throw new ConvexError("Home program not found");

    const patient = await ctx.db.get(program.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

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
