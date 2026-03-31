"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { useCallback, useRef, useState } from "react";

import type { Id } from "../../../../convex/_generated/dataModel";

export function useEvaluations(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(anyApi.evaluations.getByPatient, isAuthenticated ? { patientId } : "skip");
}

export function useEvaluation(evalId: Id<"evaluations"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    anyApi.evaluations.get,
    isAuthenticated && evalId ? { evalId } : "skip"
  );
}

export function useCreateEvaluation() {
  return useMutation(anyApi.evaluations.create);
}

export function useUpdateEvaluation() {
  return useMutation(anyApi.evaluations.update);
}

export function useUpdateEvaluationStatus() {
  return useMutation(anyApi.evaluations.updateStatus);
}

export function useSignEvaluation() {
  return useMutation(anyApi.evaluations.sign);
}

export function useUnsignEvaluation() {
  return useMutation(anyApi.evaluations.unsign);
}

// ── SSE generation hook ──────────────────────────────────────────────────────

interface EvalAIResult {
  clinicalInterpretation: string;
  recommendations: string;
}

type EvalGenerationStatus = "idle" | "generating" | "complete" | "error";

interface EvalGenerationState {
  status: EvalGenerationStatus;
  streamedText: string;
  result: EvalAIResult | null;
  error: string | null;
}

export function useEvalGeneration() {
  const [state, setState] = useState<EvalGenerationState>({
    status: "idle",
    streamedText: "",
    result: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState({ status: "idle", streamedText: "", result: null, error: null });
  }, []);

  const generate = useCallback(async (evaluationId: Id<"evaluations">) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState({ status: "generating", streamedText: "", result: null, error: null });

    try {
      const response = await fetch("/api/generate-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluationId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error: ${response.status}`);
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
        buffer = lines.pop() ?? "";

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7);
            if (i + 1 < lines.length && lines[i + 1].startsWith("data: ")) {
              let data;
              try {
                data = JSON.parse(lines[i + 1].slice(6));
              } catch {
                i++;
                continue;
              }
              i++;

              if (eventType === "eval-chunk") {
                setState((prev) => ({
                  ...prev,
                  streamedText: prev.streamedText + (data.text as string),
                }));
              } else if (eventType === "eval-complete") {
                setState((prev) => ({
                  ...prev,
                  status: "complete",
                  result: data as EvalAIResult,
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

      setState((prev) =>
        prev.status === "generating" ? { ...prev, status: "complete" } : prev
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
  }, []);

  return { ...state, generate, reset };
}
