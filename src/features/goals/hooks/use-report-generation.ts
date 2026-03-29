"use client";

import { useCallback, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type ReportStatus = "idle" | "generating" | "complete" | "error";

interface ReportGenerationState {
  status: ReportStatus;
  streamedText: string;
  reportId: Id<"progressReports"> | null;
  error: string | null;
}

export function useReportGeneration() {
  const [state, setState] = useState<ReportGenerationState>({
    status: "idle",
    streamedText: "",
    reportId: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState({ status: "idle", streamedText: "", reportId: null, error: null });
  }, []);

  const generate = useCallback(
    async (args: {
      patientId: string;
      reportType: "weekly-summary" | "monthly-summary" | "iep-progress-report";
      periodStart: string;
      periodEnd: string;
    }) => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState({ status: "generating", streamedText: "", reportId: null, error: null });

      try {
        const response = await fetch("/api/generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
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
                const data = JSON.parse(lines[i + 1].slice(6));
                i++;
                if (eventType === "report-chunk") {
                  setState((prev) => ({
                    ...prev,
                    streamedText: prev.streamedText + (data.text as string),
                  }));
                } else if (eventType === "report-complete") {
                  setState((prev) => ({
                    ...prev,
                    status: "complete",
                    reportId: data.reportId as Id<"progressReports">,
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

        setState((prev) => prev.status === "generating" ? { ...prev, status: "complete" } : prev);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      } finally {
        if (abortControllerRef.current === controller) abortControllerRef.current = null;
      }
    },
    [],
  );

  return { ...state, generate, reset };
}

export function useReport(reportId: Id<"progressReports"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.progressReports.get, isAuthenticated && reportId ? { reportId } : "skip");
}

export function useReports(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.progressReports.list, isAuthenticated ? { patientId } : "skip");
}

export function useMarkReportReviewed() {
  return useMutation(api.progressReports.markReviewed);
}

export function useSignReport() {
  return useMutation(api.progressReports.sign);
}

export function useUnsignReport() {
  return useMutation(api.progressReports.unsign);
}

export function useUpdateReportNarrative() {
  return useMutation(api.progressReports.updateNarrative);
}
