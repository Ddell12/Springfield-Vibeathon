"use client";

import {
  ConversationProvider,
  useConversation,
} from "@elevenlabs/react";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import type { SpeechCoachConfig } from "../lib/config";
import { buildSessionGuidance } from "../lib/session-guidance";

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
  speechCoachConfig?: SpeechCoachConfig;
};

export function ActiveSession(props: Props) {
  return (
    // ConversationProvider stores the signedUrl and provides SDK context.
    // All session logic lives in ActiveSessionInner via useConversation.
    <ConversationProvider signedUrl={props.signedUrl}>
      <ActiveSessionInner {...props} />
    </ConversationProvider>
  );
}

function ActiveSessionInner({
  onConversationStarted,
  onEnd,
  durationMinutes,
  sessionConfig,
  speechCoachConfig,
}: Props) {
  // wasConnected distinguishes "never connected" (initial disconnected state)
  // from "disconnected after a live session" so we only call onEnd on the latter.
  const wasConnected = useRef(false);
  const hasStarted = useRef(false);
  const hasSentGuidance = useRef(false);
  const sessionGuidance = buildSessionGuidance(sessionConfig, speechCoachConfig);

  // useConversation is the recommended ElevenLabs SDK hook. Callbacks are
  // registered via useLayoutEffect (useRegisterCallbacks inside the hook), so
  // they are stable across re-renders and are live in listenerMap before
  // startSession is called. status/isSpeaking are read from SDK-managed state.
  const { startSession, endSession, sendContextualUpdate, status, isSpeaking } = useConversation({
    onConnect: ({ conversationId }) => {
      wasConnected.current = true;
      onConversationStarted(conversationId);
    },
    onDisconnect: () => {
      if (wasConnected.current) {
        onEnd();
      }
    },
    onError: (message) => {
      console.error("[SpeechCoach] Conversation error:", message);
      toast.error("Speech session interrupted", {
        description: "The connection was lost. Please try again.",
      });
      onEnd();
    },
  });

  // Defer startSession past React StrictMode's unmount/remount cycle.
  //
  // WHY: ConversationProvider has a useEffect cleanup that sets shouldEndRef=true
  // and calls endSession() when it unmounts. StrictMode simulates an unmount after
  // the first effect run, killing any in-progress connection. setTimeout(0) is a
  // macro-task that fires after the cleanup/remount cycle completes. At that point:
  //   - ConversationProvider has reset shouldEndRef=false (via startSession internals)
  //   - useRegisterCallbacks (useLayoutEffect) has re-registered all SDK callbacks
  //   - listenerMap.compose() captures live handlers, not dead ones from instance 1
  // The timeout is cancelled in cleanup (StrictMode first pass), so startSession
  // is called exactly once on the stable final mount.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasStarted.current) return;
      hasStarted.current = true;
      startSession();
    }, 0);
    return () => clearTimeout(timer);
  }, [startSession]);

  useEffect(() => {
    if (status !== "connected" || hasSentGuidance.current || !sessionGuidance) return;
    hasSentGuidance.current = true;
    sendContextualUpdate(sessionGuidance);
  }, [sendContextualUpdate, sessionGuidance, status]);

  // Connection timeout — exit gracefully if WebSocket never establishes.
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
    const timeout = setTimeout(() => endSession(), durationMinutes * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [durationMinutes, endSession]);

  const handleStop = useCallback(() => {
    endSession();
    // endSession() is a no-op when not connected; call onEnd() directly so the
    // user can always escape even if the connection failed.
    if (status !== "connected") {
      onEnd();
    }
  }, [endSession, status, onEnd]);

  const isConnected = status === "connected";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-8">
      {/* Animated speaking/listening indicator */}
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
            isSpeaking ? "scale-110 bg-primary/40" : "scale-95 bg-muted"
          )}
        />
        <span className="absolute text-4xl" aria-hidden="true">
          {isSpeaking ? "\uD83D\uDDE3\uFE0F" : "\uD83D\uDC42"}
        </span>
      </div>

      {/* Status text driven by SDK state */}
      <p className="text-center text-lg text-muted-foreground">
        {isConnected
          ? (isSpeaking ? "Coach is talking..." : "Listening...")
          : "Connecting..."}
      </p>

      {/* Always-enabled stop button */}
      <Button onClick={handleStop} variant="outline" size="lg" className="mt-8">
        Stop Session
      </Button>
    </div>
  );
}
