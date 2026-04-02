import { describe, expect, it } from "vitest";

import { createSpeechCoachAgent } from "../agent";
import { createSpeechCoachRealtimeModelOptions } from "../entrypoint";
import {
  SPEECH_COACH_REALTIME_MODEL,
  SPEECH_COACH_VOICE_MODE,
} from "../model-config";

describe("createSpeechCoachAgent", () => {
  it("creates an agent with bounded instructions and tools", () => {
    const agent = createSpeechCoachAgent({
      instructions: "Coach a child through articulation practice.",
      tools: ["target-word-picker"],
    });

    expect(agent).toBeTruthy();
  });
});

describe("createSpeechCoachRealtimeModelOptions", () => {
  it("uses a speaking native-audio model path", () => {
    const options = createSpeechCoachRealtimeModelOptions();

    expect(options).toEqual({
      model: SPEECH_COACH_REALTIME_MODEL,
    });
    expect(SPEECH_COACH_VOICE_MODE).toBe("native-audio");
    expect(SPEECH_COACH_REALTIME_MODEL).toContain("native-audio");
  });
});
