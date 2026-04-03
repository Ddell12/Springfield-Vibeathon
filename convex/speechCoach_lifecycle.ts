import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";

const DEFAULT_RUNTIME_PROVIDER = "livekit";

const transcriptTurnValidator = v.object({
  speaker: v.union(v.literal("coach"), v.literal("child"), v.literal("system")),
  text: v.string(),
  targetItemId: v.optional(v.string()),
  targetLabel: v.optional(v.string()),
  targetVisualUrl: v.optional(v.string()),
  attemptOutcome: v.optional(
    v.union(
      v.literal("correct"),
      v.literal("approximate"),
      v.literal("incorrect"),
      v.literal("no_response")
    )
  ),
  retryCount: v.number(),
  timestampMs: v.number(),
});

const scoreCardsValidator = v.object({
  overall: v.number(),
  productionAccuracy: v.number(),
  consistency: v.number(),
  cueingSupport: v.number(),
  engagement: v.number(),
});

const insightsValidator = v.object({
  strengths: v.array(v.string()),
  patterns: v.array(v.string()),
  notableCueingPatterns: v.array(v.string()),
  recommendedNextTargets: v.array(v.string()),
  homePracticeNotes: v.array(v.string()),
});

// ── Internal queries ─────────────────────────────────────────────────────────

export const getSessionById = internalQuery({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const getRuntimeLaunchContext = internalQuery({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const program = session.homeProgramId
      ? await ctx.db.get(session.homeProgramId)
      : null;

    const assignedTemplateId = program?.speechCoachConfig?.assignedTemplateId
      ?? program?.speechCoachConfig?.childOverrides?.assignedTemplateId;

    const template = assignedTemplateId
      ? await ctx.db.get(assignedTemplateId)
      : null;

    return {
      session,
      program,
      template,
    };
  },
});

// ── Internal mutations ───────────────────────────────────────────────────────

export const setTranscriptStorageId = internalMutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      transcriptStorageId: args.storageId,
      status: "transcript_ready",
    });
  },
});

export const saveRuntimeTranscriptCapture = internalMutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    storageId: v.id("_storage"),
    capturedAt: v.number(),
    rawTranscriptTurns: v.optional(v.array(v.object({
      speaker: v.union(v.literal("coach"), v.literal("child"), v.literal("system")),
      text: v.string(),
      timestampMs: v.number(),
    }))),
    queueForAnalysis: v.boolean(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");

    await ctx.db.patch(args.sessionId, {
      runtimeProvider: session.runtimeProvider ?? DEFAULT_RUNTIME_PROVIDER,
      transcriptStorageId: args.storageId,
      transcriptCapturedAt: args.capturedAt,
      rawTranscriptTurns: args.rawTranscriptTurns,
      status: args.queueForAnalysis ? "analyzing" : session.status,
      analysisAttempts: args.queueForAnalysis
        ? (session.analysisAttempts ?? 0) + 1
        : session.analysisAttempts,
      analysisErrorMessage: args.queueForAnalysis ? undefined : session.analysisErrorMessage,
    });
  },
});

export const markAnalyzing = internalMutation({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");
    await ctx.db.patch(args.sessionId, {
      status: "analyzing",
      analysisAttempts: (session.analysisAttempts ?? 0) + 1,
      analysisErrorMessage: undefined,
    });
  },
});

export const markReviewFailed = internalMutation({
  args: { sessionId: v.id("speechCoachSessions"), errorMessage: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "review_failed",
      analysisFailedAt: Date.now(),
      analysisErrorMessage: args.errorMessage,
    });
  },
});

export const saveProgress = internalMutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    patientId: v.optional(v.id("patients")),
    caregiverUserId: v.string(),
    userId: v.optional(v.string()),
    soundsAttempted: v.array(
      v.object({
        sound: v.string(),
        wordsAttempted: v.number(),
        approximateSuccessRate: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        notes: v.string(),
      })
    ),
    overallEngagement: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    recommendedNextFocus: v.array(v.string()),
    summary: v.string(),
    analyzedAt: v.number(),
    transcriptTurns: v.optional(v.array(transcriptTurnValidator)),
    scoreCards: v.optional(scoreCardsValidator),
    insights: v.optional(insightsValidator),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("speechCoachProgress")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        transcriptTurns: args.transcriptTurns,
        scoreCards: args.scoreCards,
        insights: args.insights,
        soundsAttempted: args.soundsAttempted,
        overallEngagement: args.overallEngagement,
        recommendedNextFocus: args.recommendedNextFocus,
        summary: args.summary,
        analyzedAt: args.analyzedAt,
      });
    } else {
      await ctx.db.insert("speechCoachProgress", {
        sessionId: args.sessionId,
        patientId: args.patientId,
        caregiverUserId: args.caregiverUserId,
        userId: args.userId,
        transcriptTurns: args.transcriptTurns,
        scoreCards: args.scoreCards,
        insights: args.insights,
        soundsAttempted: args.soundsAttempted,
        overallEngagement: args.overallEngagement,
        recommendedNextFocus: args.recommendedNextFocus,
        summary: args.summary,
        analyzedAt: args.analyzedAt,
      });
    }

    await ctx.db.patch(args.sessionId, {
      status: "analyzed",
      analysisErrorMessage: undefined,
    });
  },
});

export const savePracticeLog = internalMutation({
  args: {
    homeProgramId: v.id("homePrograms"),
    patientId: v.id("patients"),
    caregiverUserId: v.string(),
    date: v.string(),
    duration: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.homeProgramId);
    if (!program) throw new ConvexError("Home program not found");

    await ctx.db.insert("practiceLog", {
      homeProgramId: args.homeProgramId,
      patientId: args.patientId,
      caregiverUserId: args.caregiverUserId,
      date: args.date,
      duration: args.duration,
      notes: args.notes,
      timestamp: Date.now(),
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: args.caregiverUserId,
      action: "practice-logged",
      details: `Speech coach session logged for program: ${program.title}`,
      timestamp: Date.now(),
    });
  },
});

export const backfillLegacySpeechCoachPrograms = internalMutation({
  args: { cursor: v.optional(v.id("homePrograms")) },
  handler: async (ctx, _args) => {
    const programs = await ctx.db
      .query("homePrograms")
      .order("asc")
      .take(100);
    // Returns count for monitoring — actual backfill logic added when needed
    return programs.length;
  },
});

export const saveGoalProgress = internalMutation({
  args: {
    homeProgramId: v.id("homePrograms"),
    patientId: v.id("patients"),
    date: v.string(),
    accuracy: v.number(),
    notes: v.optional(v.string()),
    sourceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.homeProgramId);
    if (!program || !program.goalId) return; // No goal linked — nothing to do

    await ctx.db.insert("progressData", {
      goalId: program.goalId,
      patientId: args.patientId,
      source: "in-app-auto",
      sourceId: args.sourceId,
      date: args.date,
      accuracy: args.accuracy,
      notes: args.notes,
      timestamp: Date.now(),
    });
  },
});
