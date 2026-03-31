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
  console.error("[SpeechCoach] ActiveSession mount, signedUrl starts with:", signedUrl.slice(0, 60));
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

  // Send session context once the conversation is live and the AudioWorklet is ready.
  //
  // WHY: The ElevenLabs SDK dispatches first_message audio to outputListeners
  // immediately after the WebSocket handshake, before setupInputOutput() populates
  // outputListeners (AudioContext + AudioWorklet load takes ~100-500ms). The greeting
  // is silently dropped. Sending a contextual_update when status reaches "connected"
  // fires AFTER outputListeners is ready, triggering the agent to respond again so
  // the user actually hears it.
  //
  // NOTE: Do NOT include imperative "begin the session" instructions here — Gemini
  // interprets them as a single-turn task and calls end_call after completing it.
  // Just send the session configuration context; the agent's own prompt handles flow.
  useEffect(() => {
    if (status !== "connected" || contextSent.current) return;
    contextSent.current = true;

    const parts: string[] = [];
    if (sessionConfig) {
      parts.push(`Session context: target sounds are ${sessionConfig.targetSounds.join(", ")}.`);
      parts.push(`Child age range: ${sessionConfig.ageRange} years.`);
      if (sessionConfig.focusArea) {
        parts.push(`Focus area: ${sessionConfig.focusArea}.`);
      }
    }
    if (parts.length > 0) {
      sendContextualUpdate(parts.join(" "));
    }
  }, [status, sessionConfig, sendContextualUpdate]);

  // Start conversation on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    console.error("[SpeechCoach] Calling startSession");
    startSession({
      onConnect: ({ conversationId }) => {
        console.error("[SpeechCoach] Connected, id:", conversationId);
        onConversationStarted(conversationId);
      },
      onError: (message) => {
        console.error("[SpeechCoach] Conversation error:", message);
        toast.error("Speech session interrupted", {
          description: "The connection was lost. Please try again.",
        });
        onEnd();
      },
      onStatusChange: ({ status: s }) => {
        console.error("[SpeechCoach] Status →", s);
      },
      onDebug: (info) => {
        console.error("[SpeechCoach] Debug:", JSON.stringify(info));
      },
    });
  }, [startSession, onConversationStarted, onEnd]);

  // Detect disconnection only after a successful connection (prevents StrictMode false trigger)
  useEffect(() => {
    if (wasConnected.current && status === "disconnected") {
      onEnd();
    }
  }, [status, onEnd]);

  // Connection timeout — if the WebSocket never connects, exit gracefully.
  // The ElevenLabs SDK silently swallows connection rejections (only calls
  // onStatusChange("disconnected"), never onError), so we must detect this ourselves.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!wasConnected.current) {
        console.error("[SpeechCoach] Connection timeout after 15s");
        toast.error("Couldn't reach speech coach", {
          description: "Check your internet connection and try again.",
        });
        onEnd();
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [onEnd]);

  // Auto-stop after duration
  useEffect(() => {
    const timeout = setTimeout(() => {
      endSession();
    }, durationMinutes * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [durationMinutes, endSession]);

  const handleStop = useCallback(() => {
    endSession();
    // endSession() is a no-op when status is "disconnected" (never connected
    // or connection failed). Call onEnd() directly so the user isn't stuck.
    if (!isConnected) {
      onEnd();
    }
  }, [endSession, isConnected, onEnd]);

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
        {isConnected
          ? (isSpeaking ? "Coach is talking..." : "Listening...")
          : status === "error"
          ? "Connection error"
          : "Connecting..."}
      </p>

      {/* Stop button — always enabled so the user can exit even if connection fails */}
      <Button
        onClick={handleStop}
        variant="outline"
        size="lg"
        className="mt-8"
      >
        Stop Session
      </Button>
    </div>
  );
}
