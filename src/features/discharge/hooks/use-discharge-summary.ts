"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { useCallback, useRef, useState } from "react";

import type { Id } from "../../../../convex/_generated/dataModel";

export function useDischargeSummaries(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    anyApi.dischargeSummaries.getByPatient,
    isAuthenticated ? { patientId } : "skip"
  );
}

export function useDischargeSummary(dischargeId: Id<"dischargeSummaries"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    anyApi.dischargeSummaries.get,
    isAuthenticated && dischargeId ? { dischargeId } : "skip"
  );
}

export function useCreateDischargeSummary() {
  return useMutation(anyApi.dischargeSummaries.create);
}

export function useUpdateDischargeSummary() {
  return useMutation(anyApi.dischargeSummaries.update);
}

export function useSignDischargeSummary() {
  return useMutation(anyApi.dischargeSummaries.sign);
}

// ── SSE generation hook ──────────────────────────────────────────────────────

interface DischargeAIResult {
  narrative: string;
  recommendations: string;
}

type DischargeGenerationStatus = "idle" | "generating" | "complete" | "error";

interface DischargeGenerationState {
  status: DischargeGenerationStatus;
  streamedText: string;
  result: DischargeAIResult | null;
  error: string | null;
}

export function useDischargeGeneration() {
  const [state, setState] = useState<DischargeGenerationState>({
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

  const generate = useCallback(async (dischargeId: Id<"dischargeSummaries">) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState({ status: "generating", streamedText: "", result: null, error: null });

    try {
      const response = await fetch("/api/generate-discharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dischargeId }),
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

              if (eventType === "discharge-chunk") {
                setState((prev) => ({
                  ...prev,
                  streamedText: prev.streamedText + (data.text as string),
                }));
              } else if (eventType === "discharge-complete") {
                setState((prev) => ({
                  ...prev,
                  status: "complete",
                  result: data as DischargeAIResult,
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
