"use node";

import { ConvexError } from "convex/values";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";

export const createLiveSession = action({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    const authIdentifiers = Array.from(
      new Set(
        [identity.subject, identity.tokenIdentifier].filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        ),
      ),
    );

    const launchContext = await ctx.runQuery(internal.speechCoach.getRuntimeLaunchContext, {
      sessionId: args.sessionId,
    });
    if (!launchContext) throw new ConvexError("Session not found");
    const { session, program, template } = launchContext;

    // Verify requesting user is the caregiver or SLP for this session
    const isCaregiver = authIdentifiers.includes(session.caregiverUserId);
    if (!isCaregiver) throw new ConvexError("Not authorized");

    // LIVEKIT_URL is the Convex env var (not NEXT_PUBLIC_LIVEKIT_URL).
    // NEXT_PUBLIC_ vars are Next.js build-time only and don't exist in the Convex runtime.
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
        instructions,
        tools: resolvedConfig.tools.map((tool) => tool.key),
        targetItems,
      }),
    };
  },
});
