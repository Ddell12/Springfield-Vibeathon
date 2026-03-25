"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { TherapyBlueprintSchema, type TherapyBlueprint } from "@/features/builder/lib/schemas";

export type StreamingStatus = "idle" | "generating" | "live" | "failed";

export interface StreamingFile {
  path: string;
  contents: string;
  version?: number;
}

export interface Activity {
  id: string;
  type: "thinking" | "writing_file" | "file_written" | "complete";
  message: string;
  path?: string;
  timestamp: number;
}

export interface UseStreamingReturn {
  status: StreamingStatus;
  files: StreamingFile[];
  generate: (prompt: string) => Promise<void>;
  blueprint: TherapyBlueprint | null;
  error: string | null;
  sessionId: string | null;
  streamingText: string;
  activities: Activity[];
}

export interface UseStreamingOptions {
  onFileComplete?: (path: string, contents: string) => Promise<void>;
}

function parseSSEEvents(text: string): Array<{ event: string; data: unknown }> {
  const events: Array<{ event: string; data: unknown }> = [];
  const chunks = text.split("\n\n");
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const lines = chunk.split("\n");
    let eventType = "";
    let dataLine = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice("event: ".length).trim();
      } else if (line.startsWith("data: ")) {
        dataLine = line.slice("data: ".length).trim();
      }
    }
    if (eventType && dataLine) {
      try {
        events.push({ event: eventType, data: JSON.parse(dataLine) });
      } catch {
        // Ignore malformed JSON
      }
    }
  }
  return events;
}

export function useStreaming(options?: UseStreamingOptions): UseStreamingReturn {
  const [status, setStatus] = useState<StreamingStatus>("idle");
  const [files, setFiles] = useState<StreamingFile[]>([]);
  const [blueprint, setBlueprint] = useState<TherapyBlueprint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const onFileCompleteRef = useRef(options?.onFileComplete);
  onFileCompleteRef.current = options?.onFileComplete;

  const activityCounterRef = useRef(0);
  const tokenBufferRef = useRef("");
  const rafIdRef = useRef<number>();
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const addActivity = useCallback(
    (type: Activity["type"], message: string, path?: string) => {
      const id = `activity-${++activityCounterRef.current}`;
      setActivities((prev) => [
        ...prev,
        { id, type, message, path, timestamp: Date.now() },
      ]);
    },
    []
  );

  const handleEvent = useCallback(
    (event: string, d: Record<string, unknown>) => {
      switch (event) {
        case "session":
          if (d.sessionId) setSessionId(d.sessionId as string);
          break;

        case "status": {
          const newStatus = d.status as string;
          if (newStatus === "live") setStatus("live");
          else if (newStatus === "generating") setStatus("generating");
          break;
        }

        case "token":
          tokenBufferRef.current += d.token as string;
          if (!rafIdRef.current) {
            rafIdRef.current = requestAnimationFrame(() => {
              setStreamingText(tokenBufferRef.current);
              rafIdRef.current = undefined;
            });
          }
          break;

        case "activity":
          addActivity(
            d.type as Activity["type"],
            d.message as string,
            d.path as string | undefined
          );
          break;

        case "file_complete": {
          const path = d.path as string;
          const contents = d.contents as string;
          setFiles((prev) => {
            const idx = prev.findIndex((f) => f.path === path);
            const newFile: StreamingFile = { path, contents };
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = newFile;
              return updated;
            }
            return [...prev, newFile];
          });
          // Fire-and-forget — errors handled by the WebContainer hook
          onFileCompleteRef.current?.(path, contents);
          break;
        }

        case "blueprint": {
          const parsed = TherapyBlueprintSchema.safeParse(d.data);
          if (parsed.success) setBlueprint(parsed.data);
          break;
        }

        case "image_generated":
          addActivity("file_written", `Generated image: ${d.label as string}`);
          break;

        case "speech_generated":
          addActivity("file_written", `Generated audio: "${d.text as string}"`);
          break;

        case "stt_enabled":
          addActivity("complete", "Speech input enabled");
          break;

        case "done":
          // Flush any buffered tokens before marking as live
          if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = undefined;
          }
          setStreamingText(tokenBufferRef.current);
          setStatus("live");
          if (d.sessionId) setSessionId(d.sessionId as string);
          break;

        case "error":
          setError(d.message as string);
          setStatus("failed");
          break;
      }
    },
    [addActivity]
  );

  const generate = useCallback(
    async (prompt: string): Promise<void> => {
      if (abortRef.current) {
        abortRef.current.abort();
        // Cancel any pending rAF from the previous generation
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = undefined;
        }
      }
      const controller = new AbortController();
      abortRef.current = controller;

      // Reset state for new generation
      setError(null);
      setStatus("generating");
      setStreamingText("");
      tokenBufferRef.current = "";
      setActivities([]);
      setFiles([]);

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            sessionId: sessionIdRef.current ?? undefined,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          setError(`Request failed: ${response.status}`);
          setStatus("failed");
          return;
        }

        const body = response.body;
        if (!body) {
          setError("No response body");
          setStatus("failed");
          return;
        }

        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lastDoubleNewline = buffer.lastIndexOf("\n\n");
          if (lastDoubleNewline === -1) continue;

          const toProcess = buffer.slice(0, lastDoubleNewline + 2);
          buffer = buffer.slice(lastDoubleNewline + 2);

          const events = parseSSEEvents(toProcess);
          for (const { event, data } of events) {
            handleEvent(event, data as Record<string, unknown>);
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          const events = parseSSEEvents(buffer);
          for (const { event, data } of events) {
            handleEvent(event, data as Record<string, unknown>);
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message ?? "Unknown error");
        setStatus("failed");
      }
    },
    [handleEvent]
  );

  // Cleanup on unmount: cancel pending rAF and abort in-flight request
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  return {
    status,
    files,
    generate,
    blueprint,
    error,
    sessionId,
    streamingText,
    activities,
  };
}
