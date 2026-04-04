import {
  cli,
  defineAgent,
  inference,
  JobContext,
  voice,
  WorkerOptions,
} from "@livekit/agents";
import { RoomEvent } from "livekit-client";
import * as google from "@livekit/agents-plugin-google";
import { ConvexHttpClient } from "convex/browser";
import { fileURLToPath } from "url";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdventureSessionEngine } from "./adventure-engine";
import { createAdventureAgent, createSpeechCoachAgent } from "./agent";
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
  targetItems?: Array<{ id: string; label: string; visualUrl?: string }>;
  // Adventure mode
  mode?: "classic" | "adventure";
  themeSlug?: string;
  targetSounds?: string[];
  patientId?: string;
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

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";
    const runtimeSecret = process.env.SPEECH_COACH_RUNTIME_SECRET ?? "";

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

      if (!convexUrl || !runtimeSecret) {
        console.error("[speech-coach] missing env vars — cannot persist transcript");
        return;
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
      mode: metadata.mode ?? "classic",
    });

    if (
      metadata.mode === "adventure" &&
      metadata.patientId &&
      metadata.themeSlug &&
      sessionId
    ) {
      // Adventure mode: initialize the adaptive engine and start the adventure agent
      const engine = new AdventureSessionEngine({
        patientId: metadata.patientId,
        themeSlug: metadata.themeSlug,
        targetSounds: metadata.targetSounds ?? [],
        convexUrl,
        runtimeSecret,
      });

      await engine.initialize();

      // Listen for inbound data channel messages from caregiver/SLP clients
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ctx.room as any).on(RoomEvent.DataReceived, async (payload: Uint8Array) => {
        let msg: { type: string; status?: string };
        try {
          msg = JSON.parse(new TextDecoder().decode(payload)) as { type: string; status?: string };
        } catch {
          return;
        }

        if (msg.type === "hint_requested") {
          // Inject a one-turn hint instruction into the session
          // session.interrupt() stops current speech; the agent will re-engage with the injected context
          try {
            await session.interrupt();
          } catch { /* non-critical */ }
          console.info("[speech-coach] hint_requested — agent delivering model cue");
        }

        if (msg.type === "boost_requested") {
          try {
            await engine.requestBoost();
            await session.interrupt();
          } catch { /* non-critical */ }
          console.info("[speech-coach] boost_requested — difficulty retreated");
        }

        if (msg.type === "agent_status") {
          if (msg.status === "paused") {
            try {
              await session.interrupt();
            } catch { /* non-critical */ }
            console.info("[speech-coach] agent paused by SLP take-over");
          } else if (msg.status === "active") {
            console.info("[speech-coach] agent resumed by SLP");
            // Agent re-engages naturally on next audio input — no explicit action needed
          }
        }
      });

      // Register adventure-specific shutdown: persist word log + recompute mastery
      ctx.addShutdownCallback(async () => {
        const payload = engine.buildSessionPayload();
        if (payload.totalAttempts === 0) return;

        if (!convexUrl || !runtimeSecret) {
          console.error("[speech-coach] missing env vars — cannot persist adventure session");
          return;
        }

        try {
          const convexClient = new ConvexHttpClient(convexUrl);
          await convexClient.action(api.adventureSessionActions.persistAdventureSession, {
            runtimeSecret,
            sessionId: sessionId as Id<"speechCoachSessions">,
            patientId: metadata.patientId! as Id<"patients">,
            ...payload,
          });
        } catch (err) {
          console.error("[speech-coach] adventure session persistence failed:", err);
        }
      });

      await session.start({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        room: ctx.room as any,
        agent: createAdventureAgent({
          themeSlug: metadata.themeSlug,
          baseInstructions:
            metadata.instructions ??
            "You are a friendly speech coach helping a child practice speech sounds through interactive storytelling.",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          room: ctx.room as any,
          sessionId,
          convexUrl,
          runtimeSecret,
          engine,
        }),
      });
    } else {
      // Classic mode (unchanged)
      await session.start({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        room: ctx.room as any,
        agent: createSpeechCoachAgent({
          instructions:
            metadata.instructions ??
            "You are a helpful speech coach. Guide the child through articulation practice with patience and encouragement.",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          room: ctx.room as any,
          sessionId: sessionId ?? "",
          convexUrl,
          runtimeSecret,
          targetItems: metadata.targetItems,
        }),
      });
    }
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
