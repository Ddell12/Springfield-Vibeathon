import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

describe("logAttemptFromRuntime", () => {
  it("rejects calls with wrong agentSecret", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("LIVEKIT_AGENT_SECRET", "correct-agent-secret");
    vi.stubEnv("SPEECH_COACH_RUNTIME_SECRET", "runtime-secret");

    const sessionId = await t.run((ctx) =>
      ctx.db.insert("speechCoachSessions", {
        caregiverUserId: "caregiver-789",
        userId: "caregiver-789",
        mode: "standalone",
        agentId: "speech-coach",
        runtimeProvider: "livekit",
        status: "active",
        config: { targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 },
      })
    );

    await expect(
      t.action(api.speechCoachRuntimeActions.logAttemptFromRuntime, {
        sessionId,
        runtimeSecret: "runtime-secret",
        agentSecret: "wrong-secret",
        targetLabel: "sun",
        outcome: "correct" as const,
        retryCount: 0,
        timestampMs: Date.now(),
      })
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects calls when LIVEKIT_AGENT_SECRET env var is not set", async () => {
    const t = convexTest(schema, modules);
    // Do not stub LIVEKIT_AGENT_SECRET — simulates misconfigured deployment
    vi.stubEnv("SPEECH_COACH_RUNTIME_SECRET", "runtime-secret");

    const sessionId = await t.run((ctx) =>
      ctx.db.insert("speechCoachSessions", {
        caregiverUserId: "caregiver-789",
        userId: "caregiver-789",
        mode: "standalone",
        agentId: "speech-coach",
        runtimeProvider: "livekit",
        status: "active",
        config: { targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 },
      })
    );

    await expect(
      t.action(api.speechCoachRuntimeActions.logAttemptFromRuntime, {
        sessionId,
        runtimeSecret: "runtime-secret",
        agentSecret: "any-secret",
        targetLabel: "sun",
        outcome: "correct" as const,
        retryCount: 0,
        timestampMs: Date.now(),
      })
    ).rejects.toThrow("Unauthorized");
  });
});
