import {
  cli,
  defineAgent,
  inference,
  JobContext,
  voice,
  WorkerOptions,
} from "@livekit/agents";
import * as google from "@livekit/agents-plugin-google";
import { ConvexHttpClient } from "convex/browser";
import { fileURLToPath } from "url";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { createSpeechCoachAgent } from "./agent";
import { SPEECH_COACH_REALTIME_MODEL, SPEECH_COACH_VOICE_MODE } from "./model-config";
import {
  bufferConversationItem,
  buildTranscriptPersistencePayload,
  captureUserInputTranscription,
  createTranscriptBufferState,
} from "./transcript-buffer";

if (!process.env.LIVEKIT_URL && process.env.NEXT_PUBLIC_LIVEKIT_URL) {
  process.env.LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;
}

type RoomMetadata = {
  sessionId?: string;
  instructions?: string;
  tools?: string[];
  targetItems?: Array<{ id: string; label: string; visualUrl?: string }>;
};

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
    stt: new inference.STT({
      model: "deepgram/nova-3",
      language: "en-US",
    }),
  });
}

const agent = defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    let metadata: RoomMetadata = {};
    try {
      if (ctx.room.metadata) {
        metadata = JSON.parse(ctx.room.metadata) as RoomMetadata;
      }
    } catch {
      metadata = {};
    }

    const session = createSpeechCoachSession();
    const transcriptBuffer = createTranscriptBufferState();
    const sessionId = resolveSessionId(ctx, metadata);

    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (event: voice.ConversationItemAddedEvent) => {
      bufferConversationItem(transcriptBuffer, event.item);
    });

    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (event: voice.UserInputTranscribedEvent) => {
      captureUserInputTranscription(transcriptBuffer, event);
    });

    ctx.addShutdownCallback(async () => {
      if (!sessionId) {
        console.warn("[speech-coach] skipping transcript persistence: sessionId missing");
        return;
      }

      const payload = buildTranscriptPersistencePayload(transcriptBuffer);
      if (!payload) {
        console.warn("[speech-coach] no committed transcript turns captured");
        return;
      }

      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
      const runtimeSecret = process.env.SPEECH_COACH_RUNTIME_SECRET;
      if (!convexUrl || !runtimeSecret) {
        throw new Error("Speech coach transcript persistence env vars are missing");
      }

      const convex = new ConvexHttpClient(convexUrl);
      await convex.action(api.speechCoachRuntimeActions.persistTranscript, {
        sessionId: sessionId as Id<"speechCoachSessions">,
        runtimeSecret,
        rawTranscript: payload.rawTranscript,
        rawTranscriptTurns: payload.rawTranscriptTurns,
        capturedAt: Date.now(),
      });
    });

    console.info("[speech-coach] starting LiveKit session", {
      model: SPEECH_COACH_REALTIME_MODEL,
      voiceMode: SPEECH_COACH_VOICE_MODE,
      roomName: ctx.room.name,
      sessionId,
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

function resolveSessionId(ctx: JobContext, metadata: RoomMetadata): string | null {
  if (metadata.sessionId) return metadata.sessionId;

  const roomName = ctx.room.name ?? "";
  const match = roomName.match(/^speech-coach-(.+)$/);
  return match?.[1] ?? null;
}

export default agent;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli.runApp(new WorkerOptions({
    agent: fileURLToPath(import.meta.url),
    shutdownProcessTimeout: 120 * 1000,
  }));
}
