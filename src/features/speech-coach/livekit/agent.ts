import { voice } from "@livekit/agents";
import type { Room } from "livekit-client";

import { createSpeechCoachTools } from "./tools";

type SpeechCoachAgentConfig = {
  instructions: string;
  room: Room;
  sessionId: string;
  convexUrl: string;
  runtimeSecret: string;
  targetItems?: Array<{ id: string; label: string; visualUrl?: string }>;
};

export function createSpeechCoachAgent(config: SpeechCoachAgentConfig): voice.Agent {
  const tools = createSpeechCoachTools({
    room: config.room,
    sessionId: config.sessionId,
    convexUrl: config.convexUrl,
    runtimeSecret: config.runtimeSecret,
  });

  const targetSummary = (config.targetItems ?? [])
    .map((item) => `${item.label}${item.visualUrl ? ` (${item.visualUrl})` : ""}`)
    .join(", ");

  const instructions =
    targetSummary.length > 0
      ? `${config.instructions}\nUse only these planned target items during prompting: ${targetSummary}`
      : config.instructions;

  return new voice.Agent({ instructions, tools });
}
