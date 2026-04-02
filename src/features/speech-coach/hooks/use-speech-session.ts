"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export type SessionConfig = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  durationMinutes: number;
  focusArea?: string;
};

export type LiveKitRuntimeSession = {
  runtime: "livekit-agent";
  roomName: string;
  serverUrl: string;
  tokenPath: string;
  roomMetadata?: string;
};

type SessionPhase = "idle" | "connecting" | "active" | "ending" | "reviewing" | "done" | "error";

export function useSpeechSession(homeProgramId: Id<"homePrograms">) {
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [sessionId, setSessionId] = useState<Id<"speechCoachSessions"> | null>(null);
  const [runtimeSession, setRuntimeSession] = useState<LiveKitRuntimeSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(5);
  const [sessionConfig, setCurrentSessionConfig] = useState<SessionConfig | null>(null);

  // Subscribe to server status while in reviewing phase to auto-transition
  const sessionDetail = useQuery(
    api.speechCoach.getSessionDetail,
    phase === "reviewing" && sessionId ? { sessionId } : "skip"
  );

  useEffect(() => {
    if (phase !== "reviewing") return;
    const status = sessionDetail?.session.status;
    if (status === "analyzed") {
      setPhase("done");
    } else if (status === "review_failed") {
      setError(sessionDetail?.session.analysisErrorMessage ?? "Review failed. You can retry below.");
      setPhase("error");
    }
  }, [phase, sessionDetail]);

  const createSession = useMutation(api.speechCoach.createSession);
  const startSession = useMutation(api.speechCoach.startSession);
  const endSessionMutation = useMutation(api.speechCoach.endSession);
  const failSessionMutation = useMutation(api.speechCoach.failSession);
  const createLiveSession = useAction(api.speechCoachRuntimeActions.createLiveSession);

  const begin = useCallback(async (config: SessionConfig) => {
    let id: Id<"speechCoachSessions"> | undefined;
    try {
      setPhase("connecting");
      setError(null);

      // Check mic permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        setError("We need your microphone so the coach can hear your child. Please allow microphone access and try again.");
        setPhase("error");
        return;
      }

      // Create session record
      id = await createSession({ homeProgramId, config });
      setSessionId(id ?? null);
      setDurationMinutes(config.durationMinutes);
      setCurrentSessionConfig(config);

      // Get LiveKit room metadata
      const liveSession = await createLiveSession({ sessionId: id! });
      setRuntimeSession(liveSession);
      setPhase("active");

      return { sessionId: id, runtimeSession: liveSession };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start session";
      setError(msg);
      setPhase("error");
      if (id) {
        await failSessionMutation({ sessionId: id, errorMessage: msg }).catch(() => {});
      }
    }
  }, [createSession, createLiveSession, failSessionMutation, homeProgramId]);

  const markActive = useCallback(async (conversationId: string) => {
    if (!sessionId) return;
    await startSession({ sessionId, conversationId });
  }, [sessionId, startSession]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    setPhase("ending");
    try {
      await endSessionMutation({ sessionId });
      setPhase("reviewing");
    } catch (err) {
      console.error("[SpeechCoach] End session error:", err);
      setPhase("error");
    }
  }, [sessionId, endSessionMutation]);

  const reset = useCallback(() => {
    setPhase("idle");
    setSessionId(null);
    setRuntimeSession(null);
    setError(null);
    setCurrentSessionConfig(null);
  }, []);

  return { phase, sessionId, runtimeSession, error, durationMinutes, sessionConfig, begin, markActive, endSession, reset, sessionDetail };
}
