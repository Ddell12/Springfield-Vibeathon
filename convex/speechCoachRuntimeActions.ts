"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

export const createLiveSession = action({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (_ctx, args) => {
    // LIVEKIT_URL is the Convex env var (not NEXT_PUBLIC_LIVEKIT_URL).
    // NEXT_PUBLIC_ vars are Next.js build-time only and don't exist in the Convex runtime.
    return {
      runtime: "livekit-agent" as const,
      roomName: `speech-coach-${args.sessionId}`,
      serverUrl: process.env.LIVEKIT_URL ?? "",
      tokenPath: "/api/speech-coach/livekit-token",
    };
  },
});
