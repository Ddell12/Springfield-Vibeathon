"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
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
  roomMetadata?: string;
};

type Props = {
  runtimeSession: LiveKitRuntimeSession;
  onConversationStarted: (conversationId: string) => void;
  onEnd: () => void;
  durationMinutes: number;
  sessionConfig?: SessionConfig;
  speechCoachConfig?: SpeechCoachConfig;
};

export type SessionVisualState = {
  targetLabel: string;
  targetVisualUrl?: string;
  promptState: "listen" | "your_turn" | "try_again" | "nice_job";
  attemptOutcome?: "correct" | "approximate" | "incorrect" | "no_response";
  totalCorrect: number;
};

export function getCelebrationMode({ totalCorrect }: { totalCorrect: number }) {
  return totalCorrect > 0 && totalCorrect % 5 === 0 ? "milestone" : "check";
}

const promptCopy: Record<SessionVisualState["promptState"], string> = {
  listen: "Listen carefully",
  your_turn: "Your turn — give it a try!",
  try_again: "Good effort — let's try once more",
  nice_job: "Nice job",
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
  sessionConfig,
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

  // TODO: wire to LiveKit data-channel events for real-time target state updates
  const [visual] = useState<SessionVisualState>({
    targetLabel: sessionConfig?.targetSounds?.[0] ?? "Practice sound",
    promptState: "listen",
    totalCorrect: 0,
  });

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
        roomMetadata: runtimeSession.roomMetadata,
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
  }, [runtimeSession.roomMetadata, runtimeSession.roomName, runtimeSession.tokenPath]);

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

      {/* Target card — shows current practice item and connection status. */}
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6">
        <div className="w-full rounded-3xl bg-background p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Current practice
          </p>
          <div className="mt-4 flex flex-col items-center gap-4">
            <div
              className={cn(
                "flex h-48 w-48 items-center justify-center overflow-hidden rounded-3xl bg-muted/40",
                "transition-opacity duration-300",
                isConnected ? "opacity-100" : "opacity-50",
              )}
            >
              {visual.targetVisualUrl ? (
                <Image
                  src={visual.targetVisualUrl}
                  alt={visual.targetLabel}
                  width={192}
                  height={192}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-headline text-5xl text-foreground">
                  {visual.targetLabel}
                </span>
              )}
            </div>
            <p className="font-headline text-3xl text-foreground">{visual.targetLabel}</p>
            <p className="text-sm text-muted-foreground">
              {promptCopy[visual.promptState]}
            </p>
            {!isConnected && (
              <p className="text-xs text-muted-foreground/60">Connecting...</p>
            )}
            {visual.attemptOutcome === "correct" ? (
              <div aria-label="correct-attempt">Nice job</div>
            ) : null}
            {getCelebrationMode({ totalCorrect: visual.totalCorrect }) === "milestone" ? (
              <>
                {/* TODO: replace with animation component */}
                <div aria-hidden="true">Fireworks</div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Always-enabled stop button */}
      <Button onClick={handleStop} variant="outline" size="lg" className="mt-4">
        Stop Session
      </Button>
    </div>
  );
}
