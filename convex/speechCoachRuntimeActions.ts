"use node";

import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

const SPEECH_COACH_AGENT_ID = "speech-coach";
const DEFAULT_RUNTIME_PROVIDER = "livekit";

const rawTranscriptTurnValidator = v.object({
  speaker: v.union(v.literal("coach"), v.literal("child"), v.literal("system")),
  text: v.string(),
  timestampMs: v.number(),
});

type SpeechCoachSessionDoc = {
  _id: Id<"speechCoachSessions">;
  caregiverUserId: string;
  agentId: string;
  runtimeProvider?: "livekit" | "elevenlabs";
  transcriptStorageId?: Id<"_storage">;
};

type RuntimeLaunchContext = {
  session: Doc<"speechCoachSessions">;
  program: Doc<"homePrograms"> | null;
  template: Doc<"speechCoachTemplates"> | null;
} | null;

export const createLiveSession = action({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args): Promise<{
    runtime: "livekit-agent";
    roomName: string;
    serverUrl: string;
    tokenPath: string;
    roomMetadata: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    const authIdentifiers = Array.from(
      new Set(
        [identity.subject, identity.tokenIdentifier].filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        ),
      ),
    );

    const launchContext: RuntimeLaunchContext = await ctx.runQuery(internal.speechCoach_lifecycle.getRuntimeLaunchContext, {
      sessionId: args.sessionId,
    });
    if (!launchContext) throw new ConvexError("Session not found");
    const { session, program, template } = launchContext;

    const isCaregiver = authIdentifiers.includes(session.caregiverUserId);
    if (!isCaregiver) throw new ConvexError("Not authorized");

    const livekitUrl = process.env.LIVEKIT_URL;
    if (!livekitUrl) throw new ConvexError("LIVEKIT_URL not configured");

    const { buildSessionGuidance } = await import("../src/features/speech-coach/lib/session-guidance");
    const {
      buildSpeechCoachRuntimeInstructions,
      resolveSpeechCoachRuntimeConfig,
    } = await import("../src/features/speech-coach/lib/runtime-config");

    const coachConfig = program?.speechCoachConfig;
    const sessionGuidance = buildSessionGuidance(session.config, coachConfig);
    const childOverrides = coachConfig?.childOverrides ?? {
      targetSounds: session.config.targetSounds,
      ageRange: session.config.ageRange,
      defaultDurationMinutes: session.config.durationMinutes,
      preferredThemes: coachConfig?.coachSetup?.preferredThemes ?? [],
      avoidThemes: coachConfig?.coachSetup?.avoidThemes ?? [],
      promptAddendum: coachConfig?.coachSetup?.slpNotes,
    };

    const resolvedConfig = resolveSpeechCoachRuntimeConfig({
      template: template ?? {
        name: "Default Speech Coach",
        voice: { provider: "elevenlabs", voiceKey: "child-friendly" },
        prompt: {},
        tools: [],
        skills: [],
        knowledgePackIds: [],
        customKnowledgeSnippets: [],
        sessionDefaults: {
          ageRange: session.config.ageRange,
          defaultDurationMinutes: session.config.durationMinutes,
        },
      },
      childOverrides,
    });

    const instructions = buildSpeechCoachRuntimeInstructions({
      resolvedConfig,
      sessionGuidance,
    });

    const targetItems = resolvedConfig.targetSounds.map((sound) => ({
      id: sound,
      label: sound,
    }));

    return {
      runtime: "livekit-agent" as const,
      roomName: `speech-coach-${args.sessionId}`,
      serverUrl: livekitUrl,
      tokenPath: "/api/speech-coach/livekit-token",
      roomMetadata: JSON.stringify({
        sessionId: session._id,
        instructions,
        tools: resolvedConfig.tools.map((tool) => tool.key),
        targetItems,
        // Adventure mode fields — passed through if present in session config
        ...(session.config.mode === "adventure" && {
          mode: "adventure" as const,
          themeSlug: session.config.themeSlug,
          targetSounds: session.config.targetSounds,
          patientId: session.patientId,
        }),
      }),
    };
  },
});

export const persistTranscript = action({
  args: {
    sessionId: v.id("speechCoachSessions"),
    runtimeSecret: v.string(),
    rawTranscript: v.string(),
    rawTranscriptTurns: v.array(rawTranscriptTurnValidator),
    capturedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.SPEECH_COACH_RUNTIME_SECRET;
    if (!expectedSecret) throw new ConvexError("SPEECH_COACH_RUNTIME_SECRET not configured");
    if (args.runtimeSecret !== expectedSecret) throw new ConvexError("Invalid runtime secret");

    const session = await ctx.runQuery(internal.speechCoach_lifecycle.getSessionById, {
      sessionId: args.sessionId,
    }) as SpeechCoachSessionDoc | null;
    if (!session) throw new ConvexError("Session not found");
    if (session.agentId !== SPEECH_COACH_AGENT_ID) {
      throw new ConvexError("Session does not belong to the speech coach runtime");
    }
    if ((session.runtimeProvider ?? DEFAULT_RUNTIME_PROVIDER) !== "livekit") {
      throw new ConvexError("Transcript persistence is only supported for LiveKit sessions");
    }

    const transcriptBlob = new Blob([args.rawTranscript], { type: "text/plain" });
    const storageId = await ctx.storage.store(transcriptBlob);

    if (session.transcriptStorageId) {
      await ctx.storage.delete(session.transcriptStorageId).catch(() => undefined);
    }

    await ctx.runMutation(internal.speechCoach_lifecycle.saveRuntimeTranscriptCapture, {
      sessionId: args.sessionId,
      storageId,
      capturedAt: args.capturedAt,
      rawTranscriptTurns: args.rawTranscriptTurns,
      queueForAnalysis: true,
    });

    await ctx.scheduler.runAfter(0, internal.speechCoachActions.analyzeSession, {
      sessionId: args.sessionId,
    });

    return { ok: true as const, storageId };
  },
});

export const logAttemptFromRuntime = action({
  args: {
    sessionId: v.id("speechCoachSessions"),
    runtimeSecret: v.string(),
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
    const expectedRuntimeSecret = process.env.SPEECH_COACH_RUNTIME_SECRET;
    if (!expectedRuntimeSecret) throw new ConvexError("SPEECH_COACH_RUNTIME_SECRET not configured");
    if (args.runtimeSecret !== expectedRuntimeSecret) throw new ConvexError("Invalid runtime secret");

    await ctx.runMutation(internal.speechCoach.logAttempt, {
      sessionId: args.sessionId,
      targetLabel: args.targetLabel,
      outcome: args.outcome,
      retryCount: args.retryCount,
      timestampMs: args.timestampMs,
    });

    return { ok: true as const };
  },
});
