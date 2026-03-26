"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { extractErrorMessage } from "@/core/utils";
import { type TherapyBlueprint,TherapyBlueprintSchema } from "@/features/builder/lib/schemas";
import { parseSSEEvent,type SSEEvent } from "@/features/builder/lib/sse-events";

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

export interface ResumeSessionArgs {
  sessionId: string;
  files: StreamingFile[];
  blueprint?: TherapyBlueprint | null;
  bundleHtml?: string | null;
}

export interface UseStreamingReturn {
  status: StreamingStatus;
  files: StreamingFile[];
  generate: (prompt: string) => Promise<void>;
  resumeSession: (args: ResumeSessionArgs) => void;
  blueprint: TherapyBlueprint | null;
  appName: string | null;
  error: string | null;
  sessionId: string | null;
  streamingText: string;
  activities: Activity[];
  bundleHtml: string | null;
  reset: () => void;
}

export interface UseStreamingOptions {
  onFileComplete?: (path: string, contents: string) => Promise<void>;
  onBundle?: (html: string) => void;
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
  const [appName, setAppName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [bundleHtml, setBundleHtml] = useState<string | null>(null);

  const reset = () => {
    abortRef.current?.abort();
    setStatus("idle");
    setFiles([]);
    setBlueprint(null);
    setAppName(null);
    setError(null);
    setSessionId(null);
    setStreamingText("");
    setActivities([]);
    setBundleHtml(null);
  };

  const abortRef = useRef<AbortController | null>(null);
  const onFileCompleteRef = useRef(options?.onFileComplete);
  const onBundleRef = useRef(options?.onBundle);
  const activityCounterRef = useRef(0);
  const tokenBufferRef = useRef("");
  const rafIdRef = useRef<number | undefined>(undefined);
  const sessionIdRef = useRef(sessionId);

  useEffect(() => {
    onFileCompleteRef.current = options?.onFileComplete;
  }, [options?.onFileComplete]);

  useEffect(() => {
    onBundleRef.current = options?.onBundle;
  }, [options?.onBundle]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

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
    (sseEvent: SSEEvent) => {
      switch (sseEvent.event) {
        case "session":
          setSessionId(sseEvent.sessionId);
          break;

        case "status":
          if (sseEvent.status === "bundling") {
            // Keep showing generating state to user during bundling
            setStatus("generating");
          } else if (sseEvent.status === "live") {
            setStatus("live");
          } else if (sseEvent.status === "generating") {
            setStatus("generating");
          }
          break;

        case "token":
          tokenBufferRef.current += sseEvent.token;
          if (!rafIdRef.current) {
            rafIdRef.current = requestAnimationFrame(() => {
              setStreamingText(tokenBufferRef.current);
              rafIdRef.current = undefined;
            });
          }
          break;

        case "activity":
          addActivity(sseEvent.type, sseEvent.message, sseEvent.path);
          break;

        case "file_complete": {
          const { path, contents } = sseEvent;
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
          // Write to WebContainer — log errors but don't fail the stream
          onFileCompleteRef.current?.(path, contents)?.catch((err: unknown) => {
            console.error(`[streaming] Failed to write ${path}:`, err);
          });
          break;
        }

        case "app_name":
          setAppName(sseEvent.name);
          break;

        case "blueprint": {
          const parsed = TherapyBlueprintSchema.safeParse(sseEvent.data);
          if (parsed.success) setBlueprint(parsed.data);
          break;
        }

        case "image_generated":
          addActivity("file_written", `Generated image: ${sseEvent.label}`);
          break;

        case "speech_generated":
          addActivity("file_written", `Generated audio: "${sseEvent.text}"`);
          break;

        case "stt_enabled":
          addActivity("complete", "Speech input enabled");
          break;

        case "bundle":
          setBundleHtml(sseEvent.html);
          onBundleRef.current?.(sseEvent.html);
          break;

        case "done":
          // Flush any buffered tokens before marking as live
          if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = undefined;
          }
          setStreamingText(tokenBufferRef.current);
          setStatus("live");
          if (sseEvent.sessionId) setSessionId(sseEvent.sessionId);
          break;

        case "error":
          setError(sseEvent.message);
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
      setAppName(null);
      setBundleHtml(null);

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
          let detail = `Request failed: ${response.status}`;
          try {
            const errBody = await response.json();
            if (errBody.error) detail = errBody.error;
          } catch {
            // response may not be JSON
          }
          setError(detail);
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
            const typed = parseSSEEvent(event, data);
            if (typed) handleEvent(typed);
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          const events = parseSSEEvents(buffer);
          for (const { event, data } of events) {
            const typed = parseSSEEvent(event, data);
            if (typed) handleEvent(typed);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(extractErrorMessage(err));
        setStatus("failed");
      }
    },
    [handleEvent]
  );

  const resumeSession = useCallback(
    (args: ResumeSessionArgs) => {
      setSessionId(args.sessionId);
      sessionIdRef.current = args.sessionId;
      setFiles(args.files);
      setStatus("live");
      setError(null);
      setStreamingText("");
      setActivities([]);
      if (args.blueprint !== undefined) {
        setBlueprint(args.blueprint ?? null);
      }
      if (args.bundleHtml !== undefined) {
        setBundleHtml(args.bundleHtml ?? null);
      }
    },
    []
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
    resumeSession,
    blueprint,
    appName,
    error,
    sessionId,
    streamingText,
    activities,
    bundleHtml,
    reset,
  };
}
