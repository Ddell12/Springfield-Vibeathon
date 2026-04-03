import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { assertCaregiverAccess, assertPatientAccess, getAuthRole, getAuthUserId } from "./lib/auth";
import { authedMutation, authedQuery } from "./lib/customFunctions";

const SPEECH_COACH_AGENT_ID = "speech-coach";
const DEFAULT_RUNTIME_PROVIDER = "livekit";

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
      runtimeProvider: DEFAULT_RUNTIME_PROVIDER,
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
      runtimeProvider: session.runtimeProvider ?? DEFAULT_RUNTIME_PROVIDER,
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
      analysisErrorMessage: undefined,
    });

    if ((session.runtimeProvider ?? DEFAULT_RUNTIME_PROVIDER) === "elevenlabs" && session.conversationId) {
      await ctx.db.patch(args.sessionId, {
        analysisAttempts: (session.analysisAttempts ?? 0) + 1,
      });
      await ctx.scheduler.runAfter(0, internal.speechCoachActions.analyzeSession, {
        sessionId: args.sessionId,
      });
    }

    // 90-second timeout — marks session as review_failed if still analyzing after 90s
    await ctx.scheduler.runAfter(90_000, internal.speechCoachActions.checkSessionTimeout, {
      sessionId: args.sessionId,
    });
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
    let callerRole: "slp" | "caregiver" | null = null;
    if (session.patientId) {
      const access = await assertPatientAccess(ctx, session.patientId);
      callerRole = access.role;
    } else {
      const userId = await getAuthUserId(ctx);
      if (!userId || session.userId !== userId) {
        throw new ConvexError("Not authorized");
      }
      // For standalone sessions, resolve role from JWT
      callerRole = await getAuthRole(ctx);
    }

    const progress = await ctx.db
      .query("speechCoachProgress")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    // Strip rawAttempts for non-SLP callers — rawAttempts contains PHI (target word labels)
    const safeSession =
      callerRole !== "slp"
        ? { ...session, rawAttempts: undefined }
        : session;

    return { session: safeSession, progress };
  },
});


export const retryReview = mutation({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");
    if (session.patientId) {
      await assertPatientAccess(ctx, session.patientId);
    } else {
      // Standalone session — verify the caller owns it.
      // Check session.userId first (canonical standalone field); fall back to
      // caregiverUserId for sessions created before userId was added.
      const userId = await getAuthUserId(ctx);
      const ownerField = session.userId ?? session.caregiverUserId;
      if (!userId || ownerField !== userId) {
        throw new ConvexError("Not authorized");
      }
    }
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


// ── Standalone mode (no patient/program required) ─────────────────────────

export const createStandaloneSession = authedMutation({
  args: { config: configValidator },
  handler: async (ctx, args) => {
    return await ctx.db.insert("speechCoachSessions", {
      userId: ctx.userId,
      caregiverUserId: ctx.userId,
      mode: "standalone",
      agentId: SPEECH_COACH_AGENT_ID,
      runtimeProvider: DEFAULT_RUNTIME_PROVIDER,
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
      runtimeProvider: session.runtimeProvider ?? DEFAULT_RUNTIME_PROVIDER,
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
      analysisErrorMessage: undefined,
    });

    if ((session.runtimeProvider ?? DEFAULT_RUNTIME_PROVIDER) === "elevenlabs" && session.conversationId) {
      await ctx.db.patch(args.sessionId, {
        analysisAttempts: (session.analysisAttempts ?? 0) + 1,
      });
      await ctx.scheduler.runAfter(0, internal.speechCoachActions.analyzeSession, {
        sessionId: args.sessionId,
      });
    }

    // 90-second timeout — marks session as review_failed if still analyzing after 90s
    await ctx.scheduler.runAfter(90_000, internal.speechCoachActions.checkSessionTimeout, {
      sessionId: args.sessionId,
    });
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

export const getPracticeFrequency = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const allSessions = await ctx.db
      .query("speechCoachSessions")
      .withIndex("by_patientId_startedAt", (q) =>
        q.eq("patientId", args.patientId).gte("startedAt", thirtyDaysAgo)
      )
      .collect();

    const completedSessions = allSessions.filter(
      (s) => s.status === "analyzed" || s.status === "completed"
    );

    const last7 = completedSessions.filter(
      (s) => (s.startedAt ?? 0) >= sevenDaysAgo
    );
    const last30 = completedSessions;
    const avgPerWeek = last30.length > 0 ? Math.round((last30.length / 30) * 7 * 10) / 10 : 0;

    const lastSession = completedSessions[completedSessions.length - 1];
    return {
      last7Count: last7.length,
      last30Count: last30.length,
      avgPerWeek,
      consistencyLabel:
        avgPerWeek >= 3 ? "High" : avgPerWeek >= 1.5 ? "Medium" : "Low",
      lastSessionAt: lastSession?.endedAt ?? null,
      lastSessionSounds: lastSession?.config.targetSounds ?? [],
    };
  },
});

export const getLatestProgress = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    const record = await ctx.db
      .query("speechCoachProgress")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .first();

    return record ?? null;
  },
});

export const logAttempt = internalMutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    targetLabel: v.string(),
    outcome: v.union(
      v.literal("correct"),
      v.literal("approximate"),
      v.literal("incorrect"),
      v.literal("no_response")
    ),
    retryCount: v.number(),
    timestampMs: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");
    const existing = session.rawAttempts ?? [];
    await ctx.db.patch(args.sessionId, {
      rawAttempts: [
        ...existing,
        {
          targetLabel: args.targetLabel,
          outcome: args.outcome,
          retryCount: args.retryCount,
          timestampMs: args.timestampMs,
        },
      ],
    });
  },
});
