import { voice } from "@livekit/agents";

export function createSpeechCoachAgent(config: {
  instructions: string;
  tools: string[];
}): voice.Agent {
  // Tools wired in Task 6 — stub accepts the list so the interface is stable.
  return new voice.Agent({ instructions: config.instructions });
}
