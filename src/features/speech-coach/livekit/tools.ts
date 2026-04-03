// Speech coach tool definitions for the LiveKit agent.
//
// These tools drive the child-facing visual state in real time:
//   signal_state  — updates the target label/image and prompt state shown on screen
//   log_attempt   — records each child response to Convex for post-session analysis
//   advance_target — signals a move to the next target word
//
// Tools publish data via room.localParticipant.publishData() (RoomEvent.DataReceived on client).
// Attempts are persisted via ConvexHttpClient calling logAttemptFromRuntime.

import { llm } from "@livekit/agents";
import { ConvexHttpClient } from "convex/browser";
import type { Room } from "livekit-client";
import { z } from "zod";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export type AgentVisualMessage =
  | {
      type: "visual_state";
      targetLabel: string;
      targetImageUrl?: string;
      promptState: "listen" | "your_turn" | "try_again" | "nice_job";
      totalCorrect: number;
    }
  | {
      type: "advance_target";
      nextLabel: string;
    };

type ToolDeps = {
  room: Room;
  sessionId: string;
  convexUrl: string;
  runtimeSecret: string;
};

function publishToClient(room: Room, msg: AgentVisualMessage): void {
  // Fire-and-forget — visual updates are best-effort; don't block the agent
  void room.localParticipant
    .publishData(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true })
    .catch((err) => console.warn("[speech-coach] publishData failed:", err));
}

export function createSpeechCoachTools(deps: ToolDeps) {
  const convex = new ConvexHttpClient(deps.convexUrl);

  return {
    signal_state: llm.tool({
      description:
        "Update the visual state shown to the child on screen. Call this at the start of each new target word and after each prompt phase change (listen, your_turn, try_again, nice_job). This drives the visual display the child sees — always call it.",
      parameters: z.object({
        targetLabel: z.string().describe("The target word or sound being practiced, e.g. 'sun'"),
        targetImageUrl: z
          .string()
          .optional()
          .describe("Optional image URL illustrating the target word"),
        promptState: z
          .enum(["listen", "your_turn", "try_again", "nice_job"])
          .describe(
            "listen = coach is about to model; your_turn = child should attempt; try_again = one more try; nice_job = correct attempt"
          ),
        totalCorrect: z
          .number()
          .int()
          .describe("Running count of correct attempts this session"),
      }),
      execute: async ({ targetLabel, targetImageUrl, promptState, totalCorrect }) => {
        publishToClient(deps.room, {
          type: "visual_state",
          targetLabel,
          targetImageUrl,
          promptState,
          totalCorrect,
        });
        return "Visual state updated";
      },
    }),

    log_attempt: llm.tool({
      description:
        "Record the child's response to a practice word. Call this immediately after every child response — correct, approximate, incorrect, or no response. This data is used for the post-session summary.",
      parameters: z.object({
        targetLabel: z
          .string()
          .describe("The word the child was attempting, e.g. 'sun'"),
        outcome: z
          .enum(["correct", "approximate", "incorrect", "no_response"])
          .describe(
            "correct = accurate production; approximate = close but not quite; incorrect = clear error; no_response = child did not attempt"
          ),
        retryCount: z
          .number()
          .int()
          .describe(
            "Number of cue levels used before this attempt: 0 = spontaneous, 1 = model, 2 = phonetic cue, 3+ = direct correction"
          ),
      }),
      execute: async ({ targetLabel, outcome, retryCount }) => {
        try {
          await convex.action(api.speechCoachRuntimeActions.logAttemptFromRuntime, {
            sessionId: deps.sessionId as Id<"speechCoachSessions">,
            runtimeSecret: deps.runtimeSecret,
            targetLabel,
            outcome,
            retryCount,
            timestampMs: Date.now(),
          });
        } catch (err) {
          // Log but don't crash the session — attempt logging is non-critical
          console.warn("[speech-coach] logAttempt failed:", err);
        }
        return "Attempt logged";
      },
    }),

    advance_target: llm.tool({
      description:
        "Signal that you are moving to the next target word. Call this before introducing a new word so the child's screen updates to show the new target.",
      parameters: z.object({
        nextLabel: z.string().describe("The new target word or sound, e.g. 'sock'"),
      }),
      execute: async ({ nextLabel }) => {
        publishToClient(deps.room, { type: "advance_target", nextLabel });
        return "Target advanced";
      },
    }),
  };
}
