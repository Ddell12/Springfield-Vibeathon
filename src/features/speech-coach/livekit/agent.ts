import { voice } from "@livekit/agents";

export function createSpeechCoachAgent(config: {
  instructions: string;
  tools: string[];
  targetItems?: Array<{ id: string; label: string; visualUrl?: string }>;
}): voice.Agent {
  const targetSummary = (config.targetItems ?? [])
    .map((item) => `${item.label}${item.visualUrl ? ` (${item.visualUrl})` : ""}`)
    .join(", ");

  const instructions =
    targetSummary.length > 0
      ? `${config.instructions}\nUse only these planned target items during prompting: ${targetSummary}`
      : config.instructions;

  // Tools wired in Task 6 — stub accepts the list so the interface is stable.
  return new voice.Agent({ instructions });
}
