import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

describe("logAttemptFromRuntime", () => {
  it("rejects calls with wrong runtimeSecret", async () => {
    const t = convexTest(schema, modules);
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
        runtimeSecret: "wrong-secret",
        targetLabel: "sun",
        outcome: "correct" as const,
        retryCount: 0,
        timestampMs: Date.now(),
      })
    ).rejects.toThrow("Invalid runtime secret");
  });

  it("allows calls with correct runtimeSecret", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("SPEECH_COACH_RUNTIME_SECRET", "correct-secret");

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

    const result = await t.action(api.speechCoachRuntimeActions.logAttemptFromRuntime, {
      sessionId,
      runtimeSecret: "correct-secret",
      targetLabel: "sun",
      outcome: "correct" as const,
      retryCount: 0,
      timestampMs: Date.now(),
    });

    expect(result.ok).toBe(true);
  });
});
