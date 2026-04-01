import { describe, expect, it } from "vitest";
import { createSpeechCoachAgent } from "../agent";

describe("createSpeechCoachAgent", () => {
  it("creates an agent with bounded instructions and tools", () => {
    const agent = createSpeechCoachAgent({
      instructions: "Coach a child through articulation practice.",
      tools: ["target-word-picker"],
    });

    expect(agent).toBeTruthy();
  });
});
