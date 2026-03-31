"use client";

import { useCallback, useRef, useState } from "react";

import { parseSSEEvent } from "@/core/sse-events";
import { parseSSEChunks } from "@/core/sse-utils";

import type { Id } from "../../../../convex/_generated/dataModel";

export type FlashcardStreamingStatus = "idle" | "generating" | "live" | "failed";

interface UseFlashcardStreamingReturn {
  status: FlashcardStreamingStatus;
  sessionId: Id<"sessions"> | null;
  activityMessage: string;
  generate: (query: string, sessionId?: Id<"sessions">) => Promise<void>;
  reset: () => void;
}


export function useFlashcardStreaming(): UseFlashcardStreamingReturn {
  const [status, setStatus] = useState<FlashcardStreamingStatus>("idle");
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const [activityMessage, setActivityMessage] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (query: string, existingSessionId?: Id<"sessions">) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("generating");
      setActivityMessage("Understanding your request...");

      try {
        const response = await fetch("/api/generate-flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            sessionId: existingSessionId,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Generation failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let reachedTerminal = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lastDoubleNewline = buffer.lastIndexOf("\n\n");
          if (lastDoubleNewline === -1) continue;

          const toProcess = buffer.slice(0, lastDoubleNewline + 2);
          buffer = buffer.slice(lastDoubleNewline + 2);

          const events = parseSSEChunks(toProcess);
          for (const { event: eventType, data } of events) {
            const typed = parseSSEEvent(eventType, data);
            if (!typed) continue;

            switch (typed.event) {
              case "session":
                setSessionId(typed.sessionId as Id<"sessions">);
                break;
              case "status":
                if (typed.status === "live") { setStatus("live"); reachedTerminal = true; }
                break;
              case "activity":
                setActivityMessage(typed.message);
                break;
              case "error":
                setStatus("failed");
                setActivityMessage(typed.message);
                reachedTerminal = true;
                break;
            }
          }
        }

        if (buffer.trim()) {
          const events = parseSSEChunks(buffer);
          for (const { event: eventType, data } of events) {
            const typed = parseSSEEvent(eventType, data);
            if (!typed) continue;
            if (typed.event === "session") setSessionId(typed.sessionId as Id<"sessions">);
            if (typed.event === "status" && typed.status === "live") { setStatus("live"); reachedTerminal = true; }
            if (typed.event === "error") {
              setStatus("failed");
              setActivityMessage(typed.message);
              reachedTerminal = true;
            }
          }
        }

        // Ensure terminal state if stream ended without explicit status/error
        if (!reachedTerminal) {
          setStatus("failed");
          setActivityMessage("Generation ended unexpectedly.");
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setStatus("failed");
          setActivityMessage("Something went wrong. Please try again.");
        }
      }
    },
    [],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setSessionId(null);
    setActivityMessage("");
  }, []);

  return { status, sessionId, activityMessage, generate, reset };
}
