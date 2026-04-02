"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
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
  // Refs for timeout guards — do not trigger re-renders.
  const wasConnected = useRef(false);
  const hasStarted = useRef(false);

  // State for token fetch result.
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);
  // isConnected drives JSX — wasConnected.current is a ref and won't re-render.
  const [isConnected, setIsConnected] = useState(false);

  // Fetch LiveKit token from the speech coach token route.
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    fetch(runtimeSession.tokenPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomName: runtimeSession.roomName,
        participantName: "participant",
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<{ token: string; serverUrl: string }>;
      })
      .then(({ token, serverUrl }) => {
        setToken(token);
        setServerUrl(serverUrl);
      })
      .catch(() => setFetchError(true));
  }, [runtimeSession.tokenPath, runtimeSession.roomName]);

  // Connection timeout — fast-fail on fetch error, or exit after 15s if room never connects.
  useEffect(() => {
    if (fetchError) {
      toast.error("Couldn't reach speech coach", {
        description: "Check your internet connection and try again.",
      });
      onEnd();
      return;
    }

    const timeout = setTimeout(() => {
      if (!wasConnected.current) {
        toast.error("Couldn't reach speech coach", {
          description: "Check your internet connection and try again.",
        });
        onEnd();
      }
    }, 15_000);
    return () => clearTimeout(timeout);
  }, [fetchError, onEnd]);

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
      {/* LiveKit room — invisible in DOM, provides audio context for the agent. */}
      {token && serverUrl && (
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          audio={true}
          video={false}
          onConnected={() => {
            wasConnected.current = true;
            setIsConnected(true);
            onConversationStarted(runtimeSession.roomName);
          }}
          onDisconnected={() => {
            if (wasConnected.current) onEnd();
          }}
        >
          <RoomAudioRenderer />
        </LiveKitRoom>
      )}

      {/* Animated listening indicator */}
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            "h-32 w-32 rounded-full transition-all duration-300",
            isConnected
              ? "scale-110 bg-primary/20 shadow-lg shadow-primary/10"
              : "scale-100 bg-muted/50"
          )}
        />
        <div
          className={cn(
            "absolute h-20 w-20 rounded-full transition-all duration-300",
            isConnected ? "scale-110 bg-primary/40" : "scale-95 bg-muted"
          )}
        />
        <span className="absolute text-4xl" aria-hidden="true">
          {"\uD83D\uDC42"}
        </span>
      </div>

      {/* Status text */}
      <p className="text-center text-lg text-muted-foreground">
        {isConnected ? "Listening..." : "Connecting..."}
      </p>

      {/* Always-enabled stop button */}
      <Button onClick={handleStop} variant="outline" size="lg" className="mt-8">
        Stop Session
      </Button>
    </div>
  );
}
