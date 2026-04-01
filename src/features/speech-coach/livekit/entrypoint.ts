import { fileURLToPath } from "url";
import { cli, defineAgent, JobContext, voice, WorkerOptions } from "@livekit/agents";

// .env.local uses NEXT_PUBLIC_LIVEKIT_URL; the LiveKit worker needs LIVEKIT_URL.
if (!process.env.LIVEKIT_URL && process.env.NEXT_PUBLIC_LIVEKIT_URL) {
  process.env.LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;
}
import * as google from "@livekit/agents-plugin-google";

import { createSpeechCoachAgent } from "./agent";
import { SPEECH_COACH_REALTIME_MODEL, SPEECH_COACH_VOICE_MODE } from "./model-config";

const agent = defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    let metadata: { instructions?: string; tools?: string[] } = {};
    try {
      if (ctx.room.metadata) {
        metadata = JSON.parse(ctx.room.metadata) as { instructions?: string; tools?: string[] };
      }
    } catch {
      // Use defaults if metadata is malformed
    }

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

export default agent;

// Bootstrap the worker — connects to LiveKit Cloud and listens for speech-coach-* jobs.
cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
