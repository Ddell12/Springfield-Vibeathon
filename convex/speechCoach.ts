import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { assertCaregiverAccess, assertPatientAccess, getAuthUserId } from "./lib/auth";
import { authedMutation, authedQuery } from "./lib/customFunctions";

const SPEECH_COACH_AGENT_ID = "speech-coach";

const configValidator = v.object({
  targetSounds: v.array(v.string()),
  ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
  durationMinutes: v.number(),
  focusArea: v.optional(v.string()),
  runtimeSnapshot: v.optional(v.object({
    templateId: v.optional(v.id("speechCoachTemplates")),
    templateVersion: v.optional(v.number()),
    voiceProvider: v.string(),
    voiceKey: v.string(),
    tools: v.array(v.string()),
    skills: v.array(v.string()),
    knowledgePackIds: v.array(v.string()),
  })),
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const createSession = mutation({
  args: {
    homeProgramId: v.id("homePrograms"),
    config: configValidator,
  },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.homeProgramId);
    if (!program) throw new ConvexError("Home program not found");
    if (program.type !== "speech-coach") {
      throw new ConvexError("This home program is not a speech-coach type");
    }
    if (program.status !== "active") {
      throw new ConvexError("Home program is not active");
    }

    // assertCaregiverAccess throws if the caller is not an accepted caregiver
    // for this patient — this also gates out SLPs and unauthenticated users
    const caregiverUserId = await assertCaregiverAccess(ctx, program.patientId);

    // Extra guard: SLP who owns the patient must not be able to create a session
    // (they could theoretically also have a caregiver link, but that's a data
    // integrity issue). Double-check via patient ownership.
    const patient = await ctx.db.get(program.patientId);
    if (patient && patient.slpUserId === caregiverUserId) {
      throw new ConvexError("SLPs cannot create speech coach sessions");
    }

    return await ctx.db.insert("speechCoachSessions", {
      patientId: program.patientId,
      homeProgramId: args.homeProgramId,
      caregiverUserId,
      agentId: SPEECH_COACH_AGENT_ID,
      status: "configuring",
      config: args.config,
    });
  },
});

export const startSession = mutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");
    if (!session.patientId) throw new ConvexError("Use startStandaloneSession for standalone sessions");

    await assertCaregiverAccess(ctx, session.patientId);

    await ctx.db.patch(args.sessionId, {
      conversationId: args.conversationId,
      status: "active",
      startedAt: Date.now(),
    });
  },
});

export const endSession = mutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");
    if (!session.patientId) throw new ConvexError("Use endStandaloneSession for standalone sessions");

    await assertCaregiverAccess(ctx, session.patientId);

    await ctx.db.patch(args.sessionId, {
      status: "analyzing",
      endedAt: Date.now(),
    });

    // Schedule analysis if we have a conversation to analyze
    if (session.conversationId) {
      await ctx.scheduler.runAfter(0, internal.speechCoachActions.analyzeSession, {
        sessionId: args.sessionId,
      });
    }
  },
});

export const failSession = mutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");
    if (!session.patientId) throw new ConvexError("Use failStandaloneSession for standalone sessions");

    await assertCaregiverAccess(ctx, session.patientId);

    await ctx.db.patch(args.sessionId, {
      status: "failed",
      errorMessage: args.errorMessage,
      endedAt: Date.now(),
    });
  },
});

// ── Queries ──────────────────────────────────────────────────────────────────

export const getSessionHistory = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    const sessions = await ctx.db
      .query("speechCoachSessions")
      .withIndex("by_patientId_startedAt", (q) => q.eq("patientId", args.patientId))
      .take(50);

    return sessions.reverse();
  },
});

export const getProgress = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    return await ctx.db
      .query("speechCoachProgress")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .take(200);
  },
});

export const getSessionDetail = query({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");

    // Standalone sessions: verify userId ownership
    // Clinical sessions: verify patient access (SLP or caregiver)
    if (session.patientId) {
      await assertPatientAccess(ctx, session.patientId);
    } else {
      const userId = await getAuthUserId(ctx);
      if (!userId || session.userId !== userId) {
        throw new ConvexError("Not authorized");
      }
    }

    const progress = await ctx.db
      .query("speechCoachProgress")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    return { session, progress };
  },
});

// ── Internal functions (for actions) ────────────────────────────────────────

export const getSessionById = internalQuery({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const setTranscriptStorageId = internalMutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      transcriptStorageId: args.storageId,
    });
  },
});

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

export const markTranscriptReady = internalMutation({
  args: { sessionId: v.id("speechCoachSessions"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      transcriptStorageId: args.storageId,
      status: "transcript_ready",
    });
  },
});

export const markAnalyzing = internalMutation({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    await ctx.db.patch(args.sessionId, {
      status: "analyzing",
      analysisAttempts: (session?.analysisAttempts ?? 0) + 1,
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

export const retryReview = mutation({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");
    if (session.patientId) await assertPatientAccess(ctx, session.patientId);
    if (session.status === "analyzing") throw new ConvexError("Review already in progress");
    if (session.status !== "review_failed") throw new ConvexError("Review is not retryable");
    await ctx.db.patch(args.sessionId, {
      status: "analyzing",
      analysisAttempts: (session.analysisAttempts ?? 0) + 1,
      analysisErrorMessage: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.speechCoachActions.analyzeSession, {
      sessionId: args.sessionId,
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

// ── Standalone mode (no patient/program required) ─────────────────────────

export const createStandaloneSession = authedMutation({
  args: { config: configValidator },
  handler: async (ctx, args) => {
    return await ctx.db.insert("speechCoachSessions", {
      userId: ctx.userId,
      caregiverUserId: ctx.userId,
      mode: "standalone",
      agentId: SPEECH_COACH_AGENT_ID,
      status: "configuring",
      config: args.config,
    });
  },
});

export const startStandaloneSession = authedMutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");

    if (session.userId !== ctx.userId) {
      throw new ConvexError("Not authorized");
    }

    await ctx.db.patch(args.sessionId, {
      conversationId: args.conversationId,
      status: "active",
      startedAt: Date.now(),
    });
  },
});

export const endStandaloneSession = authedMutation({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");

    if (session.userId !== ctx.userId) {
      throw new ConvexError("Not authorized");
    }

    await ctx.db.patch(args.sessionId, {
      status: "analyzing",
      endedAt: Date.now(),
    });

    if (session.conversationId) {
      await ctx.scheduler.runAfter(0, internal.speechCoachActions.analyzeSession, {
        sessionId: args.sessionId,
      });
    }
  },
});

export const failStandaloneSession = authedMutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");

    if (session.userId !== ctx.userId) {
      throw new ConvexError("Not authorized");
    }

    await ctx.db.patch(args.sessionId, {
      status: "failed",
      errorMessage: args.errorMessage,
      endedAt: Date.now(),
    });
  },
});

export const getStandaloneHistory = authedQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.userId) return [];

    const sessions = await ctx.db
      .query("speechCoachSessions")
      .withIndex("by_userId_mode_startedAt", (q) =>
        q.eq("userId", ctx.userId!).eq("mode", "standalone"))
      .order("desc")
      .take(50);

    return sessions;
  },
});

export const getStandaloneProgress = authedQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.userId) return [];

    return await ctx.db
      .query("speechCoachProgress")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.userId!))
      .take(200);
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
