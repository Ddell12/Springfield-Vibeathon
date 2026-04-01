// Node.js LiveKit Agents entrypoint MUST use defineAgent({ entry }) as the
// default export — this is the hook LiveKit Cloud uses to dispatch jobs.
// A named export or plain function will not be registered as a worker.
import { defineAgent, JobContext, voice } from "@livekit/agents";
import * as google from "@livekit/agents-plugin-google";

import { createSpeechCoachAgent } from "./agent";
import { SPEECH_COACH_REALTIME_MODEL, SPEECH_COACH_VOICE_MODE } from "./model-config";

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const metadata = ctx.room.metadata
      ? (JSON.parse(ctx.room.metadata) as { instructions?: string; tools?: string[] })
      : {};

    const realtimeModelOptions: ConstructorParameters<typeof google.beta.realtime.RealtimeModel>[0] =
      {
        model: SPEECH_COACH_REALTIME_MODEL,
        ...(SPEECH_COACH_VOICE_MODE === "separate-tts"
          ? { audio_output_config: { disabled: true } }
          : {}),
      };

    const session = new voice.AgentSession({
      llm: new google.beta.realtime.RealtimeModel(realtimeModelOptions),
    });

    await session.start({
      room: ctx.room,
      agent: createSpeechCoachAgent({
        instructions:
          metadata.instructions ??
          "You are a helpful speech coach. Guide the child through articulation practice with patience and encouragement.",
        tools: metadata.tools ?? [],
      }),
    });
  },
});
