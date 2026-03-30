"use client";

import { useMutation, useAction } from "convex/react";
import { useState, useCallback } from "react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type SessionConfig = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  durationMinutes: number;
  focusArea?: string;
};

type SessionPhase = "idle" | "connecting" | "active" | "ending" | "done" | "error";

export function useSpeechSession(homeProgramId: Id<"homePrograms">) {
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [sessionId, setSessionId] = useState<Id<"speechCoachSessions"> | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(5);

  const createSession = useMutation(api.speechCoach.createSession);
  const startSession = useMutation(api.speechCoach.startSession);
  const endSessionMutation = useMutation(api.speechCoach.endSession);
  const failSessionMutation = useMutation(api.speechCoach.failSession);
  const getSignedUrl = useAction(api.speechCoachActions.getSignedUrl);

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

      // Get signed URL
      const { signedUrl: url } = await getSignedUrl({});
      setSignedUrl(url);
      setPhase("active");

      return { sessionId: id, signedUrl: url };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start session";
      setError(msg);
      setPhase("error");
      if (id) {
        await failSessionMutation({ sessionId: id, errorMessage: msg }).catch(() => {});
      }
    }
  }, [createSession, getSignedUrl, failSessionMutation, homeProgramId]);

  const markActive = useCallback(async (conversationId: string) => {
    if (!sessionId) return;
    await startSession({ sessionId, conversationId });
  }, [sessionId, startSession]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    setPhase("ending");
    try {
      await endSessionMutation({ sessionId });
      setPhase("done");
    } catch (err) {
      console.error("[SpeechCoach] End session error:", err);
      setPhase("done");
    }
  }, [sessionId, endSessionMutation]);

  const reset = useCallback(() => {
    setPhase("idle");
    setSessionId(null);
    setSignedUrl(null);
    setError(null);
  }, []);

  return { phase, sessionId, signedUrl, error, durationMinutes, begin, markActive, endSession, reset };
}
