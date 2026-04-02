"use client";

import { useAction,useMutation } from "convex/react";
import { useCallback,useState } from "react";

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

export function useStandaloneSpeechSession() {
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [sessionId, setSessionId] = useState<Id<"speechCoachSessions"> | null>(null);
  const [runtimeSession, setRuntimeSession] = useState<LiveKitRuntimeSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(5);
  const [sessionConfig, setCurrentSessionConfig] = useState<SessionConfig | null>(null);

  const createSession = useMutation(api.speechCoach.createStandaloneSession);
  const startSession = useMutation(api.speechCoach.startStandaloneSession);
  const endSessionMutation = useMutation(api.speechCoach.endStandaloneSession);
  const failSessionMutation = useMutation(api.speechCoach.failStandaloneSession);
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
        setError("We need your microphone so the coach can listen. Please allow microphone access and try again.");
        setPhase("error");
        return;
      }

      // Create session record
      id = await createSession({ config });
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
  }, [createSession, createLiveSession, failSessionMutation]);

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

  return { phase, sessionId, runtimeSession, error, durationMinutes, sessionConfig, begin, markActive, endSession, reset };
}
