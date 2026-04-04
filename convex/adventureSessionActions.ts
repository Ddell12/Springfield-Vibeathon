"use node";

import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

// Called by the LiveKit agent on session end via ConvexHttpClient.action().
// Secured by runtimeSecret — not callable without the server-side secret.
export const persistAdventureSession = action({
  args: {
    runtimeSecret: v.string(),
    sessionId: v.id("speechCoachSessions"),
    patientId: v.id("patients"),
    themeSlug: v.string(),
    targetSounds: v.array(v.string()),
    startTier: v.union(v.literal("word"), v.literal("phrase"), v.literal("sentence")),
    endTier: v.union(v.literal("word"), v.literal("phrase"), v.literal("sentence")),
    totalAttempts: v.number(),
    correctAttempts: v.number(),
    wordLog: v.array(v.object({
      content: v.string(),
      tier: v.union(v.literal("word"), v.literal("phrase"), v.literal("sentence")),
      correct: v.boolean(),
      timestamp: v.number(),
    })),
  },
  handler: async (ctx, { runtimeSecret, ...payload }) => {
    const expectedSecret = process.env.SPEECH_COACH_RUNTIME_SECRET;
    if (!expectedSecret || runtimeSecret !== expectedSecret) {
      throw new ConvexError("Unauthorized");
    }

    const adventureSessionId: Id<"adventureSessions"> = await ctx.runMutation(
      internal.adventure_sessions.createAdventureSession,
      payload
    );

    await ctx.runMutation(
      internal.adventure_sessions.recomputeProgressAfterSession,
      { adventureSessionId }
    );

    return { adventureSessionId };
  },
});
