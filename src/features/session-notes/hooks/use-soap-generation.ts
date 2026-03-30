"use client";

import { useCallback, useRef, useState } from "react";

import type { Id } from "../../../../convex/_generated/dataModel";

interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

type SoapGenerationStatus = "idle" | "generating" | "complete" | "error";

interface SoapGenerationState {
  status: SoapGenerationStatus;
  streamedText: string;
  soapNote: SoapNote | null;
  error: string | null;
}

export function useSoapGeneration() {
  const [state, setState] = useState<SoapGenerationState>({
    status: "idle",
    streamedText: "",
    soapNote: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState({
      status: "idle",
      streamedText: "",
      soapNote: null,
      error: null,
    });
  }, []);

  const generate = useCallback(
    async (sessionNoteId: Id<"sessionNotes">) => {
      // Abort any in-progress generation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState({
        status: "generating",
        streamedText: "",
        soapNote: null,
        error: null,
      });

      try {
        const response = await fetch("/api/generate-soap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionNoteId }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            body.error ?? `Server error: ${response.status}`
          );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");

          // Keep the last potentially-incomplete line in the buffer
          buffer = lines.pop() ?? "";

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith("event: ")) {
              const eventType = line.slice(7);

              if (
                i + 1 < lines.length &&
                lines[i + 1].startsWith("data: ")
              ) {
                let data;
                try {
                  data = JSON.parse(lines[i + 1].slice(6));
                } catch {
                  console.warn("[soap] Malformed SSE data, skipping");
                  i++;
                  continue;
                }
                i++;

                if (eventType === "soap-chunk") {
                  setState((prev) => ({
                    ...prev,
                    streamedText: prev.streamedText + (data.text as string),
                  }));
                } else if (eventType === "soap-complete") {
                  setState((prev) => ({
                    ...prev,
                    status: "complete",
                    soapNote: data.soap as SoapNote,
                  }));
                } else if (eventType === "error") {
                  setState((prev) => ({
                    ...prev,
                    status: "error",
                    error: (data.message as string) ?? "Unknown error",
                  }));
                }
              }
            }
          }
        }

        // If we finished reading without a complete/error event, mark complete
        setState((prev) =>
          prev.status === "generating"
            ? { ...prev, status: "complete" }
            : prev
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;

        setState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    []
  );

  return {
    ...state,
    generate,
    reset,
  };
}
