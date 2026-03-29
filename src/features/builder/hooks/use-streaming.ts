"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import { parseSSEEvent,type SSEEvent } from "@/core/sse-events";
import { parseSSEChunks } from "@/core/sse-utils";
import { extractErrorMessage } from "@/core/utils";
import { type TherapyBlueprint,TherapyBlueprintSchema } from "@/features/builder/lib/schemas";

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
  generate: (prompt: string, blueprint?: TherapyBlueprint) => Promise<void>;
  resumeSession: (args: ResumeSessionArgs) => void;
  blueprint: TherapyBlueprint | null;
  appName: string | null;
  error: string | null;
  sessionId: string | null;
  streamingText: string;
  activities: Activity[];
  bundleHtml: string | null;
  buildFailed: boolean;
  notableMessage: string | null;
  reset: () => void;
}

export interface UseStreamingOptions {
  onFileComplete?: (path: string, contents: string) => Promise<void>;
  onBundle?: (html: string) => void;
}

// --- State & Actions ---

interface StreamingState {
  status: StreamingStatus;
  files: StreamingFile[];
  blueprint: TherapyBlueprint | null;
  appName: string | null;
  error: string | null;
  sessionId: string | null;
  streamingText: string;
  activities: Activity[];
  bundleHtml: string | null;
  buildFailed: boolean;
  notableMessage: string | null;
}

type StreamingAction =
  | { type: "RESET" }
  | { type: "SET_STATUS"; status: StreamingStatus }
  | { type: "SET_SESSION_ID"; sessionId: string }
  | { type: "SET_ERROR"; error: string }
  | { type: "SET_STREAMING_TEXT"; text: string }
  | { type: "SET_APP_NAME"; name: string }
  | { type: "SET_BLUEPRINT"; blueprint: TherapyBlueprint }
  | { type: "ADD_ACTIVITY"; activity: Activity }
  | { type: "UPSERT_FILE"; file: StreamingFile }
  | { type: "SET_BUNDLE"; html: string }
  | { type: "SET_BUILD_FAILED"; failed: boolean }
  | { type: "SET_NOTABLE_MESSAGE"; message: string | null }
  | { type: "START_GENERATION" }
  | { type: "DONE"; sessionId?: string; buildFailed?: boolean }
  | { type: "RESUME_SESSION"; args: ResumeSessionArgs }
  | { type: "ERROR_RESPONSE"; error: string };

const initialState: StreamingState = {
  status: "idle",
  files: [],
  blueprint: null,
  appName: null,
  error: null,
  sessionId: null,
  streamingText: "",
  activities: [],
  bundleHtml: null,
  buildFailed: false,
  notableMessage: null,
};

function streamingReducer(state: StreamingState, action: StreamingAction): StreamingState {
  switch (action.type) {
    case "RESET":
      return { ...initialState };

    case "SET_STATUS":
      return { ...state, status: action.status };

    case "SET_SESSION_ID":
      return { ...state, sessionId: action.sessionId };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "SET_STREAMING_TEXT":
      return { ...state, streamingText: action.text };

    case "SET_APP_NAME":
      return { ...state, appName: action.name };

    case "SET_BLUEPRINT":
      return { ...state, blueprint: action.blueprint };

    case "ADD_ACTIVITY":
      return { ...state, activities: [...state.activities, action.activity] };

    case "UPSERT_FILE": {
      const idx = state.files.findIndex((f) => f.path === action.file.path);
      if (idx >= 0) {
        const updated = [...state.files];
        updated[idx] = action.file;
        return { ...state, files: updated };
      }
      return { ...state, files: [...state.files, action.file] };
    }

    case "SET_BUNDLE":
      return { ...state, bundleHtml: action.html };

    case "SET_BUILD_FAILED":
      return { ...state, buildFailed: action.failed };

    case "SET_NOTABLE_MESSAGE":
      return { ...state, notableMessage: action.message };

    case "START_GENERATION":
      return {
        ...state,
        error: null,
        status: "generating",
        streamingText: "",
        activities: [],
        files: [],
        appName: null,
        bundleHtml: null,
        buildFailed: false,
        notableMessage: null,
      };

    case "DONE":
      return {
        ...state,
        status: "live",
        buildFailed: action.buildFailed ?? false,
        ...(action.sessionId ? { sessionId: action.sessionId } : {}),
      };

    case "RESUME_SESSION":
      return {
        ...state,
        sessionId: action.args.sessionId,
        files: action.args.files,
        status: "live",
        error: null,
        streamingText: "",
        activities: [],
        ...(action.args.blueprint !== undefined
          ? { blueprint: action.args.blueprint ?? null }
          : {}),
        ...(action.args.bundleHtml !== undefined
          ? { bundleHtml: action.args.bundleHtml ?? null }
          : {}),
      };

    case "ERROR_RESPONSE":
      return { ...state, error: action.error, status: "failed" };

    default:
      return state;
  }
}

// --- Hook ---

export function useStreaming(options?: UseStreamingOptions): UseStreamingReturn {
  const [state, dispatch] = useReducer(streamingReducer, initialState);

  const abortRef = useRef<AbortController | null>(null);
  const onFileCompleteRef = useRef(options?.onFileComplete);
  const onBundleRef = useRef(options?.onBundle);
  const activityCounterRef = useRef(0);
  const tokenBufferRef = useRef("");
  const rafIdRef = useRef<number | undefined>(undefined);
  const sessionIdRef = useRef(state.sessionId);

  useEffect(() => {
    onFileCompleteRef.current = options?.onFileComplete;
  }, [options?.onFileComplete]);

  useEffect(() => {
    onBundleRef.current = options?.onBundle;
  }, [options?.onBundle]);

  useEffect(() => {
    sessionIdRef.current = state.sessionId;
  }, [state.sessionId]);

  const flushTokenBuffer = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = undefined;
    }
    dispatch({ type: "SET_STREAMING_TEXT", text: tokenBufferRef.current });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "RESET" });
  }, []);

  const addActivity = useCallback(
    (type: Activity["type"], message: string, path?: string) => {
      const id = `activity-${++activityCounterRef.current}`;
      dispatch({
        type: "ADD_ACTIVITY",
        activity: { id, type, message, path, timestamp: Date.now() },
      });
    },
    []
  );

  const handleEvent = useCallback(
    (sseEvent: SSEEvent) => {
      switch (sseEvent.event) {
        case "session":
          dispatch({ type: "SET_SESSION_ID", sessionId: sseEvent.sessionId });
          break;

        case "status":
          if (sseEvent.status === "bundling") {
            dispatch({ type: "SET_STATUS", status: "generating" });
            dispatch({ type: "SET_NOTABLE_MESSAGE", message: "Putting everything together..." });
          } else if (sseEvent.status === "live") {
            dispatch({ type: "SET_STATUS", status: "live" });
          } else if (sseEvent.status === "generating") {
            dispatch({ type: "SET_STATUS", status: "generating" });
          }
          break;

        case "token":
          tokenBufferRef.current += sseEvent.token;
          if (!rafIdRef.current) {
            rafIdRef.current = requestAnimationFrame(() => {
              dispatch({ type: "SET_STREAMING_TEXT", text: tokenBufferRef.current });
              rafIdRef.current = undefined;
            });
          }
          break;

        case "activity":
          addActivity(sseEvent.type, sseEvent.message, sseEvent.path);
          break;

        case "file_complete": {
          const { path, contents = "" } = sseEvent;
          dispatch({
            type: "UPSERT_FILE",
            file: { path, contents },
          });
          onFileCompleteRef.current?.(path, contents)?.catch((err: unknown) => {
            console.error(`[streaming] Failed to write ${path}:`, err);
          });
          break;
        }

        case "app_name":
          dispatch({ type: "SET_APP_NAME", name: sseEvent.name });
          break;

        case "blueprint": {
          const parsed = TherapyBlueprintSchema.safeParse(sseEvent.data);
          if (parsed.success) dispatch({ type: "SET_BLUEPRINT", blueprint: parsed.data });
          break;
        }

        case "image_generated":
          addActivity("file_written", `Generated image: ${sseEvent.label}`);
          dispatch({ type: "SET_NOTABLE_MESSAGE", message: "Creating pictures for your app..." });
          break;

        case "speech_generated":
          addActivity("file_written", `Generated audio: "${sseEvent.text}"`);
          dispatch({ type: "SET_NOTABLE_MESSAGE", message: "Recording friendly voices..." });
          break;

        case "stt_enabled":
          addActivity("complete", "Speech input enabled");
          dispatch({ type: "SET_NOTABLE_MESSAGE", message: "Voice input is ready!" });
          break;

        case "bundle":
          dispatch({ type: "SET_BUNDLE", html: sseEvent.html });
          onBundleRef.current?.(sseEvent.html);
          break;

        case "done":
          // Flush any buffered tokens before marking as live
          if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = undefined;
          }
          dispatch({ type: "SET_STREAMING_TEXT", text: tokenBufferRef.current });
          dispatch({
            type: "DONE",
            sessionId: sseEvent.sessionId,
            buildFailed: sseEvent.buildFailed,
          });
          break;

        case "error":
          flushTokenBuffer();
          dispatch({ type: "ERROR_RESPONSE", error: sseEvent.message });
          break;
      }
    },
    [addActivity, flushTokenBuffer]
  );

  const generate = useCallback(
    async (prompt: string, blueprint?: TherapyBlueprint, patientId?: string): Promise<void> => {
      if (abortRef.current) {
        abortRef.current.abort();
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = undefined;
        }
      }
      const controller = new AbortController();
      abortRef.current = controller;

      dispatch({ type: "START_GENERATION" });
      tokenBufferRef.current = "";

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            sessionId: sessionIdRef.current ?? undefined,
            ...(blueprint ? { blueprint } : {}),
            ...(patientId ? { patientId } : {}),
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
          flushTokenBuffer();
          dispatch({ type: "ERROR_RESPONSE", error: detail });
          return;
        }

        const body = response.body;
        if (!body) {
          flushTokenBuffer();
          dispatch({ type: "ERROR_RESPONSE", error: "No response body" });
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

          const events = parseSSEChunks(toProcess);
          for (const { event, data } of events) {
            const typed = parseSSEEvent(event, data);
            if (typed) handleEvent(typed);
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          const events = parseSSEChunks(buffer);
          for (const { event, data } of events) {
            const typed = parseSSEEvent(event, data);
            if (typed) handleEvent(typed);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        flushTokenBuffer();
        dispatch({ type: "ERROR_RESPONSE", error: extractErrorMessage(err) });
      }
    },
    [handleEvent]
  );

  const resumeSession = useCallback(
    (args: ResumeSessionArgs) => {
      sessionIdRef.current = args.sessionId;
      dispatch({ type: "RESUME_SESSION", args });
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
    status: state.status,
    files: state.files,
    generate,
    resumeSession,
    blueprint: state.blueprint,
    appName: state.appName,
    error: state.error,
    sessionId: state.sessionId,
    streamingText: state.streamingText,
    activities: state.activities,
    bundleHtml: state.bundleHtml,
    buildFailed: state.buildFailed,
    notableMessage: state.notableMessage,
    reset,
  };
}
