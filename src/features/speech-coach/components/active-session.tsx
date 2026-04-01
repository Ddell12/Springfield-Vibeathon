"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import type { SpeechCoachConfig } from "../lib/config";

type SessionConfig = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  durationMinutes: number;
  focusArea?: string;
};

type LiveKitRuntimeSession = {
  runtime: "livekit-agent";
  serverUrl: string;
  tokenPath: string;
  roomName: string;
};

type Props = {
  runtimeSession: LiveKitRuntimeSession;
  onConversationStarted: (conversationId: string) => void;
  onEnd: () => void;
  durationMinutes: number;
  sessionConfig?: SessionConfig;
  speechCoachConfig?: SpeechCoachConfig;
};

export function ActiveSession(props: Props) {
  // LiveKit agent runtime — voice session managed by LiveKit Cloud worker.
  return <ActiveSessionInner {...props} />;
}

function ActiveSessionInner({
  runtimeSession,
  onConversationStarted,
  onEnd,
  durationMinutes,
}: Props) {
  // wasConnected distinguishes "never connected" from "disconnected after live session"
  // so we only call onEnd on the latter.
  const wasConnected = useRef(false);
  const hasStarted = useRef(false);

  // Simulate connection start — LiveKit room connection wired in next task.
  // Uses setTimeout to mirror the ElevenLabs StrictMode deferral pattern.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasStarted.current) return;
      hasStarted.current = true;

      // Signal connection established with a synthetic room-based conversation id.
      wasConnected.current = true;
      onConversationStarted(runtimeSession.roomName);
    }, 0);
    return () => clearTimeout(timer);
  }, [runtimeSession.roomName, onConversationStarted]);

  // Connection timeout — exit gracefully if room never connects.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!wasConnected.current) {
        toast.error("Couldn't reach speech coach", {
          description: "Check your internet connection and try again.",
        });
        onEnd();
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [onEnd]);

  // Auto-stop after configured session duration.
  useEffect(() => {
    const timeout = setTimeout(() => onEnd(), durationMinutes * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [durationMinutes, onEnd]);

  const handleStop = useCallback(() => {
    onEnd();
  }, [onEnd]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-8">
      {/* Animated listening indicator */}
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            "h-32 w-32 rounded-full transition-all duration-300",
            wasConnected.current
              ? "scale-110 bg-primary/20 shadow-lg shadow-primary/10"
              : "scale-100 bg-muted/50"
          )}
        />
        <div
          className={cn(
            "absolute h-20 w-20 rounded-full transition-all duration-300",
            wasConnected.current ? "scale-110 bg-primary/40" : "scale-95 bg-muted"
          )}
        />
        <span className="absolute text-4xl" aria-hidden="true">
          {"\uD83D\uDC42"}
        </span>
      </div>

      {/* Status text */}
      <p className="text-center text-lg text-muted-foreground">
        {wasConnected.current ? "Listening..." : "Connecting..."}
      </p>

      {/* Always-enabled stop button */}
      <Button onClick={handleStop} variant="outline" size="lg" className="mt-8">
        Stop Session
      </Button>
    </div>
  );
}
