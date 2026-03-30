import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import { assertSLP } from "./lib/auth";
import { insertProgressFromTargets } from "./lib/progress";

// ── Validators ──────────────────────────────────────────────────────────────

const sessionTypeValidator = v.union(
  v.literal("in-person"),
  v.literal("teletherapy"),
  v.literal("parent-consultation")
);

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("in-progress"),
  v.literal("complete"),
  v.literal("signed")
);

const promptLevelValidator = v.union(
  v.literal("independent"),
  v.literal("verbal-cue"),
  v.literal("model"),
  v.literal("physical")
);

const targetValidator = v.object({
  target: v.string(),
  goalId: v.optional(v.string()),
  trials: v.optional(v.number()),
  correct: v.optional(v.number()),
  promptLevel: v.optional(promptLevelValidator),
  notes: v.optional(v.string()),
});

const structuredDataValidator = v.object({
  targetsWorkedOn: v.array(targetValidator),
  behaviorNotes: v.optional(v.string()),
  parentFeedback: v.optional(v.string()),
  homeworkAssigned: v.optional(v.string()),
  nextSessionFocus: v.optional(v.string()),
});

const soapNoteValidator = v.object({
  subjective: v.string(),
  objective: v.string(),
  assessment: v.string(),
  plan: v.string(),
});

// ── Validation Helpers ──────────────────────────────────────────────────────

type TargetData = {
  target: string;
  goalId?: string;
  trials?: number;
  correct?: number;
  promptLevel?: "independent" | "verbal-cue" | "model" | "physical";
  notes?: string;
};

type SoapNoteData = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

function validateSessionDate(dateStr: string): void {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new ConvexError("Invalid session date");
  }
  const now = new Date();
  // Not in the future (allow same day)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  if (date >= tomorrow) {
    throw new ConvexError("Session date cannot be in the future");
  }
  // Within the last year
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (date < oneYearAgo) {
    throw new ConvexError("Session date must be within the last year");
  }
}

function validateSessionDuration(duration: number): void {
  if (!Number.isFinite(duration) || duration < 5 || duration > 480) {
    throw new ConvexError("Session duration must be between 5 and 480 minutes");
  }
}

function validateTargets(targets: TargetData[]): void {
  if (targets.length > 20) {
    throw new ConvexError("Maximum 20 targets per session");
  }
  for (const t of targets) {
    const name = t.target.trim();
    if (name.length === 0) {
      throw new ConvexError("Target name cannot be empty");
    }
    if (name.length > 200) {
      throw new ConvexError("Target name must be 200 characters or less");
    }
    if (t.trials !== undefined && t.correct !== undefined && t.correct > t.trials) {
      throw new ConvexError("Correct trials cannot exceed total trials");
    }
  }
}

function validateSoapNote(soap: SoapNoteData): void {
  const sections = ["subjective", "objective", "assessment", "plan"] as const;
  for (const section of sections) {
    const value = soap[section].trim();
    if (value.length === 0) {
      throw new ConvexError(`SOAP ${section} section cannot be empty`);
    }
    if (value.length > 5000) {
      throw new ConvexError(`SOAP ${section} section must be 5000 characters or less`);
    }
  }
}

// ── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    patientId: v.id("patients"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);

    // Verify the SLP owns this patient
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    const limit = args.limit ?? 20;
    return await ctx.db
      .query("sessionNotes")
      .withIndex("by_patientId_sessionDate", (q) =>
        q.eq("patientId", args.patientId)
      )
      .order("desc")
      .take(limit);
  },
});

export const get = query({
  args: { noteId: v.id("sessionNotes") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new ConvexError("Session note not found");
    if (note.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    return note;
  },
});

export const getLatestSoap = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);

    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    const notes = await ctx.db
      .query("sessionNotes")
      .withIndex("by_patientId_sessionDate", (q) =>
        q.eq("patientId", args.patientId)
      )
      .order("desc")
      .take(50);

    // Find the most recent note that has a SOAP and is complete or signed
    return notes.find(
      (n) => n.soapNote && (n.status === "complete" || n.status === "signed")
    ) ?? null;
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    patientId: v.id("patients"),
    sessionDate: v.string(),
    sessionDuration: v.number(),
    sessionType: sessionTypeValidator,
    structuredData: structuredDataValidator,
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);

    // Verify the SLP owns this patient
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    validateSessionDate(args.sessionDate);
    validateSessionDuration(args.sessionDuration);
    validateTargets(args.structuredData.targetsWorkedOn);

    const noteId = await ctx.db.insert("sessionNotes", {
      patientId: args.patientId,
      slpUserId,
      sessionDate: args.sessionDate,
      sessionDuration: args.sessionDuration,
      sessionType: args.sessionType,
      status: "draft",
      structuredData: args.structuredData,
      aiGenerated: false,
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: slpUserId,
      action: "session-documented",
      details: `Created session note for ${args.sessionDate}`,
      timestamp: Date.now(),
    });

    return noteId;
  },
});

export const update = mutation({
  args: {
    noteId: v.id("sessionNotes"),
    sessionDate: v.optional(v.string()),
    sessionDuration: v.optional(v.number()),
    sessionType: v.optional(sessionTypeValidator),
    structuredData: v.optional(structuredDataValidator),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new ConvexError("Session note not found");
    if (note.slpUserId !== slpUserId) throw new ConvexError("Not authorized");
    if (note.status === "signed") {
      throw new ConvexError("Cannot edit a signed session note");
    }

    if (args.sessionDate !== undefined) validateSessionDate(args.sessionDate);
    if (args.sessionDuration !== undefined) validateSessionDuration(args.sessionDuration);
    if (args.structuredData !== undefined) validateTargets(args.structuredData.targetsWorkedOn);

    const updates: Record<string, unknown> = {};
    if (args.sessionDate !== undefined) updates.sessionDate = args.sessionDate;
    if (args.sessionDuration !== undefined) updates.sessionDuration = args.sessionDuration;
    if (args.sessionType !== undefined) updates.sessionType = args.sessionType;
    if (args.structuredData !== undefined) updates.structuredData = args.structuredData;

    // Auto-transition draft → in-progress on first edit
    if (note.status === "draft" && Object.keys(updates).length > 0) {
      updates.status = "in-progress";
    }

    await ctx.db.patch(args.noteId, updates);
  },
});

export const updateSoap = mutation({
  args: {
    noteId: v.id("sessionNotes"),
    soapNote: soapNoteValidator,
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new ConvexError("Session note not found");
    if (note.slpUserId !== slpUserId) throw new ConvexError("Not authorized");
    if (note.status === "signed") {
      throw new ConvexError("Cannot edit a signed session note");
    }

    validateSoapNote(args.soapNote);

    await ctx.db.patch(args.noteId, {
      soapNote: args.soapNote,
      aiGenerated: false,
    });
  },
});

export const saveSoapFromAI = mutation({
  args: {
    noteId: v.id("sessionNotes"),
    soapNote: soapNoteValidator,
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new ConvexError("Session note not found");
    if (note.slpUserId !== slpUserId) throw new ConvexError("Not authorized");
    if (note.status === "signed") {
      throw new ConvexError("Cannot edit a signed session note");
    }

    validateSoapNote(args.soapNote);

    await ctx.db.patch(args.noteId, {
      soapNote: args.soapNote,
      aiGenerated: true,
    });
  },
});

export const sign = mutation({
  args: { noteId: v.id("sessionNotes") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new ConvexError("Session note not found");
    if (note.slpUserId !== slpUserId) throw new ConvexError("Not authorized");
    if (note.status !== "complete") {
      throw new ConvexError("Only complete session notes can be signed");
    }
    if (!note.soapNote) {
      throw new ConvexError("SOAP note is required before signing");
    }

    const now = Date.now();
    await ctx.db.patch(args.noteId, {
      status: "signed",
      signedAt: now,
    });

    await ctx.db.insert("activityLog", {
      patientId: note.patientId,
      actorUserId: slpUserId,
      action: "session-signed",
      details: `Signed session note for ${note.sessionDate}`,
      timestamp: now,
    });

    // Auto-create progressData for targets linked to goals
    await insertProgressFromTargets(
      ctx.db,
      note.structuredData.targetsWorkedOn,
      args.noteId,
      note.patientId,
      note.sessionDate,
    );
  },
});

export const unsign = mutation({
  args: { noteId: v.id("sessionNotes") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new ConvexError("Session note not found");
    if (note.slpUserId !== slpUserId) throw new ConvexError("Not authorized");
    if (note.status !== "signed") {
      throw new ConvexError("Only signed session notes can be unsigned");
    }

    const now = Date.now();
    await ctx.db.patch(args.noteId, {
      status: "complete",
      signedAt: undefined,
    });

    await ctx.db.insert("activityLog", {
      patientId: note.patientId,
      actorUserId: slpUserId,
      action: "session-unsigned",
      details: `Unsigned session note for ${note.sessionDate}`,
      timestamp: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    noteId: v.id("sessionNotes"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new ConvexError("Session note not found");
    if (note.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    // Cannot transition to or from signed via this function
    if (note.status === "signed") {
      throw new ConvexError("Cannot change status of a signed note — use unsign first");
    }
    if (args.status === "signed") {
      throw new ConvexError("Cannot set status to signed — use the sign function");
    }

    await ctx.db.patch(args.noteId, { status: args.status });
  },
});

export const remove = mutation({
  args: { noteId: v.id("sessionNotes") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new ConvexError("Session note not found");
    if (note.slpUserId !== slpUserId) throw new ConvexError("Not authorized");
    if (note.status === "signed") {
      throw new ConvexError("Cannot delete a signed session note");
    }

    await ctx.db.delete(args.noteId);
  },
});

export const createFromMeeting = internalMutation({
  args: {
    patientId: v.id("patients"),
    slpUserId: v.string(),
    sessionDate: v.string(),
    sessionDuration: v.number(),
    soap: soapNoteValidator,
    meetingRecordId: v.id("meetingRecords"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessionNotes", {
      patientId: args.patientId,
      slpUserId: args.slpUserId,
      sessionDate: args.sessionDate,
      sessionDuration: args.sessionDuration,
      sessionType: "teletherapy",
      status: "draft",
      structuredData: {
        targetsWorkedOn: [],
        behaviorNotes: undefined,
        parentFeedback: undefined,
        homeworkAssigned: undefined,
        nextSessionFocus: undefined,
      },
      soapNote: args.soap,
      aiGenerated: true,
      meetingRecordId: args.meetingRecordId,
    });
  },
});
