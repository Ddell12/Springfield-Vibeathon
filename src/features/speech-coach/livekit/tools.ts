// Speech coach tool definitions for the LiveKit agent.
//
// These tools drive the child-facing visual state in real time:
//   signal_state  — updates the target label/image and prompt state shown on screen
//   log_attempt   — records each child response to Convex for post-session analysis
//   advance_target — signals a move to the next target word
//
// Adventure mode adds:
//   get_next_word  — engine fetches next adaptive word
//   report_word_result — records attempt to engine + Convex, fires session_milestone if tier unlocked
//
// Tools publish data via room.localParticipant.publishData() (RoomEvent.DataReceived on client).
// Attempts are persisted via ConvexHttpClient calling logAttemptFromRuntime.

import { llm } from "@livekit/agents";
import { ConvexHttpClient } from "convex/browser";
import type { Room } from "livekit-client";
import { z } from "zod";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { AdaptationEvent, AdventureSessionEngine } from "./adventure-engine";

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
    }
  | {
      type: "session_milestone";
      tier: string;
      masteryPct: number;
    }
  | {
      type: "agent_status";
      status: "active" | "paused";
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

type AdventureToolDeps = ToolDeps & {
  engine: AdventureSessionEngine;
};

export function createAdventureTools(deps: AdventureToolDeps) {
  const convex = new ConvexHttpClient(deps.convexUrl);
  const classicTools = createSpeechCoachTools(deps);

  const get_next_word = llm.tool({
    description:
      "Fetch the next target word from the adventure engine. Call this at the start of each new round to get the word you should embed in your narrative prompt. Returns the word content and image prompt.",
    parameters: z.object({}),
    execute: async () => {
      const word = await deps.engine.getNextWord();
      if (!word) return JSON.stringify({ content: null, message: "Session complete" });
      publishToClient(deps.room, {
        type: "advance_target",
        nextLabel: word.content,
      });
      return JSON.stringify({ content: word.content, imagePrompt: word.imagePrompt, tier: word.tier, difficulty: word.difficulty });
    },
  });

  const report_word_result = llm.tool({
    description:
      "Report the outcome of a child's attempt at the current target word. Call this after every attempt. The engine will adapt difficulty automatically based on a rolling accuracy window. If a tier is unlocked, a celebration will fire automatically.",
    parameters: z.object({
      content: z.string().describe("The target word or phrase that was attempted"),
      correct: z.boolean().describe("Whether the child produced the target sound correctly"),
    }),
    execute: async ({ content, correct }) => {
      // Record to the adaptive engine
      let adaptationEvent: AdaptationEvent | null = null;
      try {
        adaptationEvent = await deps.engine.recordAttempt(content, correct);
      } catch (err) {
        console.warn("[adventure-engine] recordAttempt failed:", err);
      }

      // Persist attempt to Convex
      try {
        await convex.action(api.speechCoachRuntimeActions.logAttemptFromRuntime, {
          sessionId: deps.sessionId as Id<"speechCoachSessions">,
          runtimeSecret: deps.runtimeSecret,
          targetLabel: content,
          outcome: correct ? "correct" : "incorrect",
          retryCount: 0,
          timestampMs: Date.now(),
        });
      } catch (err) {
        console.warn("[speech-coach] logAttempt failed:", err);
      }

      // Fire milestone message if tier unlocked
      if (adaptationEvent !== null && adaptationEvent.type === "tier_unlock") {
        const { previousTier, newTier } = adaptationEvent;
        const tierAttempts = deps.engine.buildSessionPayload().wordLog.filter(
          (e) => e.tier === previousTier
        );
        const tierCorrect = tierAttempts.filter((e) => e.correct).length;
        const masteryPct = tierAttempts.length > 0 ? tierCorrect / tierAttempts.length : 0;
        publishToClient(deps.room, {
          type: "session_milestone",
          tier: previousTier,
          masteryPct,
        });
        return `Attempt recorded. Tier unlocked! Moving to ${newTier}.`;
      }

      if (adaptationEvent !== null && adaptationEvent.type === "advance_difficulty") {
        return `Attempt recorded. Difficulty advanced to ${adaptationEvent.newDifficulty}.`;
      }

      if (adaptationEvent !== null && adaptationEvent.type === "retreat_difficulty") {
        return `Attempt recorded. Difficulty eased to ${adaptationEvent.newDifficulty}.`;
      }

      return "Attempt recorded.";
    },
  });

  return { ...classicTools, get_next_word, report_word_result };
}
