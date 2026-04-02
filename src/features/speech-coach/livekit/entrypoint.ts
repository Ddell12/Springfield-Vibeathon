import { cli, defineAgent, JobContext, voice, WorkerOptions } from "@livekit/agents";
import { fileURLToPath } from "url";

// .env.local uses NEXT_PUBLIC_LIVEKIT_URL; the LiveKit worker needs LIVEKIT_URL.
if (!process.env.LIVEKIT_URL && process.env.NEXT_PUBLIC_LIVEKIT_URL) {
  process.env.LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;
}
import * as google from "@livekit/agents-plugin-google";

import { createSpeechCoachAgent } from "./agent";
import { SPEECH_COACH_REALTIME_MODEL, SPEECH_COACH_VOICE_MODE } from "./model-config";

export function createSpeechCoachRealtimeModelOptions(): ConstructorParameters<
  typeof google.beta.realtime.RealtimeModel
>[0] {
  if (SPEECH_COACH_VOICE_MODE !== "native-audio") {
    throw new Error(
      "Speech coach voice mode disables model audio without a configured TTS provider."
    );
  }

  return {
    model: SPEECH_COACH_REALTIME_MODEL,
  };
}

export function createSpeechCoachSession() {
  return new voice.AgentSession({
    llm: new google.beta.realtime.RealtimeModel(createSpeechCoachRealtimeModelOptions()),
  });
}

const agent = defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    type RoomMetadata = {
      instructions?: string;
      tools?: string[];
      targetItems?: Array<{ id: string; label: string; visualUrl?: string }>;
    };
    let metadata: RoomMetadata = {};
    try {
      if (ctx.room.metadata) {
        metadata = JSON.parse(ctx.room.metadata) as RoomMetadata;
      }
    } catch {
      // Use defaults if metadata is malformed
    }

    const session = createSpeechCoachSession();

    console.info("[speech-coach] starting LiveKit session", {
      model: SPEECH_COACH_REALTIME_MODEL,
      voiceMode: SPEECH_COACH_VOICE_MODE,
    });

    await session.start({
      room: ctx.room,
      agent: createSpeechCoachAgent({
        instructions:
          metadata.instructions ??
          "You are a helpful speech coach. Guide the child through articulation practice with patience and encouragement.",
        tools: metadata.tools ?? [],
        targetItems: metadata.targetItems,
      }),
    });
  },
});

export default agent;

// Bootstrap the worker — connects to LiveKit Cloud and listens for speech-coach-* jobs.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
}
