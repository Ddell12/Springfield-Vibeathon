"use client";

import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import Image from "next/image";
import { RoomEvent } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import type { SpeechCoachConfig } from "../lib/config";
import type { AgentVisualMessage } from "../livekit/tools";
import { CaregiverGuidanceStrip } from "./caregiver-guidance-strip";
import { PromptStateCard } from "./prompt-state-card";

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
  totalCorrect: number;
};

export function getCelebrationMode({ totalCorrect }: { totalCorrect: number }) {
  return totalCorrect > 0 && totalCorrect % 5 === 0 ? "milestone" : "check";
}

/** Receives data channel messages from the LiveKit agent and fires onMessage. Must be inside LiveKitRoom. */
function AgentDataListener({ onMessage }: { onMessage: (msg: AgentVisualMessage) => void }) {
  const room = useRoomContext();
  useEffect(() => {
    function handleData(payload: Uint8Array) {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as AgentVisualMessage;
        onMessage(msg);
      } catch {
        // Ignore malformed data
      }
    }
    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, onMessage]);
  return null;
}

export function ActiveSession(props: Props) {
  return <ActiveSessionInner {...props} />;
}

function ActiveSessionInner({
  runtimeSession,
  onConversationStarted,
  onEnd,
  durationMinutes,
  sessionConfig,
  speechCoachConfig,
}: Props) {
  const wasConnected = useRef(false);
  const hasStarted = useRef(false);
  const sessionStartTime = useRef<number | null>(null);
  const lastMilestoneRef = useRef(0);
  const onEndRef = useRef(onEnd);

  useEffect(() => { onEndRef.current = onEnd; });

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showGuidance, setShowGuidance] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const reducedMotion = speechCoachConfig?.reducedMotion ?? false;

  const [visual, setVisual] = useState<SessionVisualState>({
    targetLabel: sessionConfig?.targetSounds?.[0] ?? "Practice sound",
    promptState: "listen",
    totalCorrect: 0,
  });

  const handleAgentMessage = useCallback((msg: AgentVisualMessage) => {
    if (msg.type === "visual_state") {
      setVisual({
        targetLabel: msg.targetLabel,
        targetVisualUrl: msg.targetImageUrl,
        promptState: msg.promptState,
        totalCorrect: msg.totalCorrect,
      });
      if (msg.totalCorrect > 0 && msg.totalCorrect % 5 === 0 && msg.totalCorrect !== lastMilestoneRef.current) {
        lastMilestoneRef.current = msg.totalCorrect;
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 1500);
      }
    } else if (msg.type === "advance_target") {
      setVisual((prev) => ({ ...prev, targetLabel: msg.nextLabel, promptState: "listen" }));
    }
  }, []);

  // Tick elapsed time every second while connected (for caregiver guidance strip)
  useEffect(() => {
    if (!isConnected) return;
    const id = setInterval(() => {
      if (sessionStartTime.current) {
        setElapsedMs(Date.now() - sessionStartTime.current);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isConnected]);

  // Fetch LiveKit token
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
      onEndRef.current();
      return;
    }
    const timeout = setTimeout(() => {
      if (!wasConnected.current) {
        toast.error("Couldn't reach speech coach", {
          description: "Check your internet connection and try again.",
        });
        onEndRef.current();
      }
    }, 15_000);
    return () => clearTimeout(timeout);
  }, [fetchError]);

  // Auto-stop after session duration
  useEffect(() => {
    const timeout = setTimeout(() => onEndRef.current(), durationMinutes * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [durationMinutes]);

  const handleStop = useCallback(() => {
    onEndRef.current();
  }, []);

  const attemptDotsFilled = visual.totalCorrect % 5;

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-6 p-6">
      {/* LiveKit room — invisible in DOM, provides audio */}
      {token && serverUrl && (
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          audio={true}
          video={false}
          onConnected={() => {
            wasConnected.current = true;
            sessionStartTime.current = Date.now();
            setIsConnected(true);
            onConversationStarted(runtimeSession.roomName);
          }}
          onDisconnected={() => {
            if (wasConnected.current) onEnd();
          }}
        >
          <RoomAudioRenderer />
          <AgentDataListener onMessage={handleAgentMessage} />
        </LiveKitRoom>
      )}

      {/* Milestone confetti overlay — CSS only, skipped when reducedMotion */}
      {showConfetti && !reducedMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 animate-confetti-burst"
        />
      )}

      {/* Target card */}
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
        {/* 5-dot progress row */}
        <div className="flex gap-2" aria-label={`${attemptDotsFilled} of 5 attempts`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              data-testid="progress-dot"
              aria-hidden="true"
              className={cn(
                "h-3 w-3 rounded-full",
                !reducedMotion && "transition-colors duration-300",
                i < attemptDotsFilled ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Target image and label */}
        <div className="w-full rounded-3xl bg-background p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                "flex h-48 w-48 items-center justify-center overflow-hidden rounded-3xl bg-muted/40",
                !reducedMotion && "transition-opacity duration-300",
                isConnected ? "opacity-100" : "opacity-50"
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
                <span className="font-headline text-5xl text-foreground">{visual.targetLabel}</span>
              )}
            </div>
            <p className="font-headline text-3xl text-foreground">{visual.targetLabel}</p>
            {!isConnected && (
              <p className="text-xs text-muted-foreground/60">Connecting…</p>
            )}
          </div>
        </div>

        {/* Prompt state card */}
        <PromptStateCard state={visual.promptState} reducedMotion={reducedMotion} />
      </div>

      {/* Caregiver guidance strip */}
      {showGuidance && (
        <div className="w-full max-w-md">
          <CaregiverGuidanceStrip
            elapsedMs={elapsedMs}
            durationMs={durationMinutes * 60 * 1000}
            onDismiss={() => setShowGuidance(false)}
          />
        </div>
      )}

      <Button onClick={handleStop} variant="outline" size="lg">
        Stop Session
      </Button>
    </div>
  );
}
