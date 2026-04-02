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

    const session = await ctx.runQuery(internal.speechCoach.getSessionById, { sessionId: args.sessionId });
    if (!session) throw new ConvexError("Session not found");

    // Verify requesting user is the caregiver or SLP for this session
    const isCaregiver = session.caregiverUserId === identity.subject;
    if (!isCaregiver) throw new ConvexError("Not authorized");

    // LIVEKIT_URL is the Convex env var (not NEXT_PUBLIC_LIVEKIT_URL).
    // NEXT_PUBLIC_ vars are Next.js build-time only and don't exist in the Convex runtime.
    const livekitUrl = process.env.LIVEKIT_URL;
    if (!livekitUrl) throw new ConvexError("LIVEKIT_URL not configured");

    // Map targetSounds to targetItems so the LiveKit agent can reference them.
    const targetSounds: string[] = session.config?.targetSounds ?? [];
    const targetItems: Array<{ id: string; label: string }> = targetSounds.map((sound) => ({
      id: sound,
      label: sound,
    }));

    return {
      runtime: "livekit-agent" as const,
      roomName: `speech-coach-${args.sessionId}`,
      serverUrl: livekitUrl,
      tokenPath: "/api/speech-coach/livekit-token",
      targetItems,
    };
  },
});
