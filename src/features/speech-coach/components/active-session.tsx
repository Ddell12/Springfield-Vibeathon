"use client";

import {
  ConversationProvider,
  useConversationControls,
  useConversationMode,
  useConversationStatus,
} from "@elevenlabs/react";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

type SessionConfig = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  durationMinutes: number;
  focusArea?: string;
};

type Props = {
  signedUrl: string;
  onConversationStarted: (conversationId: string) => void;
  onEnd: () => void;
  durationMinutes: number;
  sessionConfig?: SessionConfig;
};

export function ActiveSession({ signedUrl, onConversationStarted, onEnd, durationMinutes, sessionConfig }: Props) {
  return (
    <ConversationProvider signedUrl={signedUrl}>
      <ActiveSessionInner
        onConversationStarted={onConversationStarted}
        onEnd={onEnd}
        durationMinutes={durationMinutes}
        sessionConfig={sessionConfig}
      />
    </ConversationProvider>
  );
}

function ActiveSessionInner({
  onConversationStarted,
  onEnd,
  durationMinutes,
  sessionConfig,
}: Omit<Props, "signedUrl">) {
  const hasStarted = useRef(false);
  const wasConnected = useRef(false);
  const contextSent = useRef(false);
  const { startSession, endSession, sendContextualUpdate } = useConversationControls();
  // status: "disconnected" | "connecting" | "connected" | "error"
  const { status } = useConversationStatus();
  // mode: "speaking" | "listening" — only valid while connected
  const { isSpeaking } = useConversationMode();

  const isConnected = status === "connected";

  // Track successful connection for disconnection detection
  useEffect(() => {
    if (status === "connected") wasConnected.current = true;
  }, [status]);

  // Send session context once the conversation is live.
  //
  // WHY: The ElevenLabs SDK dispatches first_message audio to outputListeners
  // immediately after the WebSocket handshake, but outputListeners is only
  // populated after setupInputOutput() completes (creating the AudioContext and
  // loading the AudioWorklet). This race means the agent's opening greeting is
  // silently dropped. Sending a contextual update when status reaches "connected"
  // fires after outputListeners is ready, guaranteeing the agent responds and
  // simultaneously gives it the session-specific context it needs.
  useEffect(() => {
    if (status !== "connected" || contextSent.current) return;
    contextSent.current = true;

    const parts: string[] = [];
    if (sessionConfig) {
      parts.push(`Practice target sounds: ${sessionConfig.targetSounds.join(", ")}.`);
      parts.push(`Child age range: ${sessionConfig.ageRange} years.`);
      if (sessionConfig.focusArea) {
        parts.push(`Focus area: ${sessionConfig.focusArea}.`);
      }
    }
    parts.push("Begin the session now — greet the child and start practicing.");
    sendContextualUpdate(parts.join(" "));
  }, [status, sessionConfig, sendContextualUpdate]);

  // Start conversation on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startSession({
      onConnect: ({ conversationId }) => {
        onConversationStarted(conversationId);
      },
      onError: (message) => {
        console.error("[SpeechCoach] Conversation error:", message);
        toast.error("Speech session interrupted", {
          description: "The connection was lost. Please try again.",
        });
        onEnd();
      },
    });
  }, [startSession, onConversationStarted, onEnd]);

  // Detect disconnection only after a successful connection (prevents StrictMode false trigger)
  useEffect(() => {
    if (wasConnected.current && status === "disconnected") {
      onEnd();
    }
  }, [status, onEnd]);

  // Auto-stop after duration
  useEffect(() => {
    const timeout = setTimeout(() => {
      endSession();
    }, durationMinutes * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [durationMinutes, endSession]);

  const handleStop = useCallback(() => {
    endSession();
  }, [endSession]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-8">
      {/* Animated indicator */}
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            "h-32 w-32 rounded-full transition-all duration-300",
            isSpeaking
              ? "scale-110 bg-primary/20 shadow-lg shadow-primary/10"
              : "scale-100 bg-muted/50"
          )}
        />
        <div
          className={cn(
            "absolute h-20 w-20 rounded-full transition-all duration-300",
            isSpeaking
              ? "scale-110 bg-primary/40"
              : "scale-95 bg-muted"
          )}
        />
        <span className="absolute text-4xl" aria-hidden="true">
          {isSpeaking ? "\uD83D\uDDE3\uFE0F" : "\uD83D\uDC42"}
        </span>
      </div>

      {/* Status text */}
      <p className="text-center text-lg text-muted-foreground">
        {status === "connecting"
          ? "Connecting..."
          : status === "error"
          ? "Connection error"
          : isSpeaking
          ? "Coach is talking..."
          : "Listening..."}
      </p>

      {/* Stop button */}
      <Button
        onClick={handleStop}
        variant="outline"
        size="lg"
        className="mt-8"
        disabled={!isConnected}
      >
        Stop Session
      </Button>
    </div>
  );
}
