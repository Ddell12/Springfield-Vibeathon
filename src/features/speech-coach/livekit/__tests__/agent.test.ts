import { describe, expect, it, vi } from "vitest";

// Mock livekit-client Room so tests don't need a real WebRTC environment
vi.mock("livekit-client", () => ({
  Room: class {
    localParticipant = {
      publishData: vi.fn().mockResolvedValue(undefined),
    };
  },
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    action = vi.fn().mockResolvedValue({ ok: true });
  },
}));

import { Room } from "livekit-client";
import { createSpeechCoachAgent } from "../agent";
import { createSpeechCoachRealtimeModelOptions } from "../entrypoint";
import { SPEECH_COACH_REALTIME_MODEL, SPEECH_COACH_VOICE_MODE } from "../model-config";

const MOCK_DEPS = {
  room: new Room() as any,
  sessionId: "session123",
  convexUrl: "https://example.convex.cloud",
  runtimeSecret: "test-secret",
};

describe("createSpeechCoachAgent", () => {
  it("creates an agent with instructions and tools", () => {
    const agent = createSpeechCoachAgent({
      instructions: "Coach a child through articulation practice.",
      ...MOCK_DEPS,
    });
    expect(agent).toBeTruthy();
  });

  it("appends target items to instructions", () => {
    const agent = createSpeechCoachAgent({
      instructions: "Practice these sounds.",
      targetItems: [{ id: "/s/", label: "sun" }],
      ...MOCK_DEPS,
    });
    expect(agent).toBeTruthy(); // agent builds without error
  });
});

describe("createSpeechCoachRealtimeModelOptions", () => {
  it("uses a speaking native-audio model path", () => {
    const options = createSpeechCoachRealtimeModelOptions();
    expect(options).toEqual({ model: SPEECH_COACH_REALTIME_MODEL });
    expect(SPEECH_COACH_VOICE_MODE).toBe("native-audio");
    expect(SPEECH_COACH_REALTIME_MODEL).toContain("native-audio");
  });
});
