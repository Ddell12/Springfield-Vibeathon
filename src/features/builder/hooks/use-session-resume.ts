"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { ResumeSessionArgs, StreamingStatus } from "./use-streaming";

export function useSessionResume(
  initialSessionId: string | null,
  status: StreamingStatus,
  sessionId: string | null,
  resumeSession: (args: ResumeSessionArgs) => void,
  handleGenerate: (prompt: string) => void,
) {
  const router = useRouter();

  // Session resume: fetch session + files when initialSessionId is provided (path-based URL)
  const resumeSessionData = useQuery(
    api.sessions.get,
    initialSessionId ? { sessionId: initialSessionId as Id<"sessions"> } : "skip"
  );
  const resumeFiles = useQuery(
    api.generated_files.list,
    initialSessionId ? { sessionId: initialSessionId as Id<"sessions"> } : "skip"
  );

  const activeSessionId = sessionId ?? initialSessionId;
  const currentSession = useQuery(
    api.sessions.get,
    activeSessionId ? { sessionId: activeSessionId as Id<"sessions"> } : "skip"
  );
  const appRecord = useQuery(
    api.apps.getBySession,
    activeSessionId ? { sessionId: activeSessionId as Id<"sessions"> } : "skip"
  );
  // Used for the "Continue where you left off" card on the prompt screen
  const mostRecent = useQuery(api.sessions.getMostRecent, initialSessionId ? "skip" : {});

  // Resume an existing session when navigating from My Apps or refreshing /builder/{id}
  const sessionResumed = useRef(false);
  useEffect(() => {
    if (
      initialSessionId &&
      resumeSessionData &&
      resumeFiles &&
      status === "idle" &&
      !sessionResumed.current
    ) {
      sessionResumed.current = true;

      // Separate the persisted bundle from user-visible files
      const bundleFile = resumeFiles.find((f) => f.path === "_bundle.html");
      const appFiles = resumeFiles.filter((f) => f.path !== "_bundle.html");

      // Restore streaming hook state
      resumeSession({
        sessionId: initialSessionId,
        files: appFiles.map((f) => ({ path: f.path, contents: f.contents })),
        blueprint: resumeSessionData.blueprint ?? null,
        bundleHtml: bundleFile?.contents ?? null,
      });
    }
  }, [initialSessionId, resumeSessionData, resumeFiles, status, resumeSession]);

  // Reset resume guard when session returns to idle (e.g., after onNewChat)
  useEffect(() => {
    if (status === "idle") {
      sessionResumed.current = false;
    }
  }, [status]);

  // Auto-submit prompt from URL query param (e.g., from template chips)
  const promptSubmitted = useRef(false);

  const handlePromptFromUrl = useCallback(
    (promptFromUrl: string | null) => {
      if (promptFromUrl && status === "idle" && !promptSubmitted.current && !initialSessionId) {
        promptSubmitted.current = true;
        handleGenerate(decodeURIComponent(promptFromUrl));
      }
    },
    [status, handleGenerate, initialSessionId]
  );

  // Navigate to path-based URL when SSE creates a new session mid-generation
  useEffect(() => {
    if (sessionId && !initialSessionId) {
      router.replace(`/builder/${sessionId}`);
    }
  }, [sessionId, initialSessionId, router]);

  // Redirect to /builder if the session doesn't exist in Convex (deleted or invalid ID)
  useEffect(() => {
    if (initialSessionId && resumeSessionData === null && resumeFiles !== undefined) {
      router.replace("/builder");
    }
  }, [initialSessionId, resumeSessionData, resumeFiles, router]);

  return {
    resumeSessionData,
    resumeFiles,
    activeSessionId,
    currentSession,
    appRecord,
    mostRecent,
    handlePromptFromUrl,
  };
}
