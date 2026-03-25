"use client";

import { useCallback, useRef, useState } from "react";

export type StreamingStatus = "idle" | "generating" | "live" | "failed";

export interface StreamingFile {
  path: string;
  contents: string;
  version?: number;
}

export interface UseStreamingReturn {
  status: StreamingStatus;
  files: StreamingFile[];
  generate: (prompt: string) => Promise<void>;
  blueprint: Record<string, unknown> | null;
  error: string | null;
  previewUrl: string | null;
  sessionId: string | null;
}

export interface UseStreamingOptions {
  onFileComplete?: (path: string, contents: string) => Promise<void>;
}

function parseSSEEvents(text: string): Array<{ event: string; data: unknown }> {
  const events: Array<{ event: string; data: unknown }> = [];
  // SSE events are separated by \n\n
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
  const [blueprint, setBlueprint] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  // previewUrl is always null — WebContainer manages the preview URL client-side
  const previewUrl: string | null = null;
  const [sessionId, setSessionId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (prompt: string): Promise<void> => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    // Clear previous error immediately (synchronously before async work)
    setError(null);
    setStatus("generating");

    try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
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

          // Process all complete events (ending with \n\n) from the buffer
          const lastDoublNewline = buffer.lastIndexOf("\n\n");
          if (lastDoublNewline === -1) continue;

          const toProcess = buffer.slice(0, lastDoublNewline + 2);
          buffer = buffer.slice(lastDoublNewline + 2);

          const events = parseSSEEvents(toProcess);
          for (const { event, data } of events) {
            const d = data as Record<string, unknown>;

            if (event === "status") {
              const newStatus = d.status as string;
              if (newStatus === "live") {
                setStatus("live");
              } else if (newStatus === "generating") {
                setStatus("generating");
              }
            } else if (event === "file_complete") {
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
              if (options?.onFileComplete) {
                await options.onFileComplete(path, contents);
              }
            } else if (event === "blueprint") {
              setBlueprint(d.data as Record<string, unknown>);
            } else if (event === "done") {
              setStatus("live");
              if (d.sessionId) setSessionId(d.sessionId as string);
            } else if (event === "error") {
              setError(d.message as string);
              setStatus("failed");
            }
          }
        }

        // Process any remaining buffer content
        if (buffer.trim()) {
          const events = parseSSEEvents(buffer);
          for (const { event, data } of events) {
            const d = data as Record<string, unknown>;
            if (event === "error") {
              setError(d.message as string);
              setStatus("failed");
            } else if (event === "status" && (d.status as string) === "live") {
              setStatus("live");
            } else if (event === "file_complete") {
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
              if (options?.onFileComplete) {
                await options.onFileComplete(path, contents);
              }
            }
          }
        }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message ?? "Unknown error");
      setStatus("failed");
    }
  }, [options]);

  return { status, files, generate, blueprint, error, previewUrl, sessionId };
}
