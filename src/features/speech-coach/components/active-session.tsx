"use client";

import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
  useConversationMode,
} from "@elevenlabs/react";
import { useCallback, useEffect, useRef } from "react";

import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/core/utils";

type Props = {
  signedUrl: string;
  onConversationStarted: (conversationId: string) => void;
  onEnd: () => void;
  durationMinutes: number;
};

export function ActiveSession({ signedUrl, onConversationStarted, onEnd, durationMinutes }: Props) {
  return (
    <ConversationProvider signedUrl={signedUrl}>
      <ActiveSessionInner
        onConversationStarted={onConversationStarted}
        onEnd={onEnd}
        durationMinutes={durationMinutes}
      />
    </ConversationProvider>
  );
}

function ActiveSessionInner({
  onConversationStarted,
  onEnd,
  durationMinutes,
}: Omit<Props, "signedUrl">) {
  const hasStarted = useRef(false);
  const { startSession, endSession } = useConversationControls();
  // status: "disconnected" | "connecting" | "connected" | "error"
  const { status } = useConversationStatus();
  // mode: "speaking" | "listening" — only valid while connected
  const { isSpeaking } = useConversationMode();

  const isConnected = status === "connected";

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

  // Detect disconnection after session started
  useEffect(() => {
    if (hasStarted.current && status === "disconnected") {
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
