"use client";

import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import Image from "next/image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import type { SpeechCoachConfig } from "../lib/config";
import type { AgentVisualMessage } from "../livekit/tools";
import { useProgressTrail } from "../hooks/use-progress-trail";

type SessionConfig = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  durationMinutes: number;
  focusArea?: string;
  mode?: "classic" | "adventure";
  themeSlug?: string;
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
  viewerRole?: "child" | "caregiver" | "slp";
};

type SessionVisualState = {
  targetLabel: string;
  targetVisualUrl?: string;
  promptState: "listen" | "your_turn" | "try_again" | "nice_job";
  totalCorrect: number;
};

const THEME_COLORS: Record<string, { banner: string; accent: string }> = {
  dinosaurs: { banner: "from-green-800 to-emerald-600", accent: "text-emerald-300" },
  ocean: { banner: "from-blue-700 to-cyan-500", accent: "text-cyan-300" },
  space: { banner: "from-indigo-900 to-violet-700", accent: "text-violet-300" },
  safari: { banner: "from-amber-700 to-yellow-500", accent: "text-yellow-300" },
  fairy: { banner: "from-pink-600 to-purple-400", accent: "text-pink-200" },
  farm: { banner: "from-lime-700 to-yellow-500", accent: "text-lime-300" },
  pirates: { banner: "from-blue-900 to-teal-700", accent: "text-teal-300" },
  superheroes: { banner: "from-red-700 to-orange-500", accent: "text-orange-300" },
  arctic: { banner: "from-sky-400 to-blue-200", accent: "text-sky-100" },
  trains: { banner: "from-orange-700 to-red-500", accent: "text-orange-200" },
};

const FEEDBACK_RING_CLASS: Record<SessionVisualState["promptState"], string> = {
  listen: "",
  your_turn: "ring-2 ring-primary/40",
  nice_job: "ring-2 ring-green-400",
  try_again: "ring-2 ring-amber-400",
};

const THEME_EMOJI: Record<string, string> = {
  dinosaurs: "🦕",
  ocean: "🐠",
  space: "🚀",
  safari: "🦁",
  fairy: "🧚",
  farm: "🐑",
  pirates: "🏴‍☠️",
  superheroes: "🦸",
  arctic: "🐧",
  trains: "🚂",
};

const PROMPT_STATE_CONFIG = {
  listen: { label: "Listen...", bg: "bg-muted/40", text: "text-muted-foreground" },
  your_turn: { label: "Your turn!", bg: "bg-primary/10", text: "text-primary" },
  nice_job: { label: "Nice job! ⭐", bg: "bg-green-100", text: "text-green-700" },
  try_again: { label: "Try again!", bg: "bg-amber-100", text: "text-amber-700" },
};

function AgentDataListener({ onMessage }: { onMessage: (msg: AgentVisualMessage) => void }) {
  const room = useRoomContext();
  useEffect(() => {
    function handleData(payload: Uint8Array) {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as AgentVisualMessage;
        onMessage(msg);
      } catch (e) {
        console.warn("[speech-coach] Malformed data channel message:", e);
      }
    }
    room.on(RoomEvent.DataReceived, handleData);
    return () => { room.off(RoomEvent.DataReceived, handleData); };
  }, [room, onMessage]);
  return null;
}

type PublishRef = { publish: (msg: { type: string }) => void };

function LiveKitPublisher({ publishRef }: { publishRef: React.RefObject<PublishRef | null> }) {
  const room = useRoomContext();
  useEffect(() => {
    publishRef.current = {
      publish: (msg) => {
        void room.localParticipant
          .publishData(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true })
          .catch((err) => console.warn("[speech-coach] publishData failed:", err));
      },
    };
    return () => { publishRef.current = null; };
  }, [room, publishRef]);
  return null;
}

export function AdventureSession(props: Props) {
  return <AdventureSessionInner {...props} />;
}

function AdventureSessionInner({
  runtimeSession,
  onConversationStarted,
  onEnd,
  durationMinutes,
  sessionConfig,
  speechCoachConfig,
  viewerRole = "child",
}: Props) {
  const wasConnected = useRef(false);
  const hasStarted = useRef(false);
  const lastMilestoneRef = useRef(0);
  const confettiTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const milestoneTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onEndRef = useRef(onEnd);
  const publishRef = useRef<PublishRef | null>(null);
  useEffect(() => { onEndRef.current = onEnd; });
  useEffect(() => () => { clearTimeout(confettiTimer.current); clearTimeout(milestoneTimer.current); }, []);

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showMilestone, setShowMilestone] = useState<{ tier: string; masteryPct: number } | null>(null);
  const [slpSpeaking, setSlpSpeaking] = useState(false);
  const [slpTakeOverActive, setSlpTakeOverActive] = useState(false);

  const reducedMotion = speechCoachConfig?.reducedMotion ?? false;
  const themeSlug = sessionConfig?.themeSlug ?? "dinosaurs";
  const themeColors = THEME_COLORS[themeSlug] ?? { banner: "from-primary to-primary/60", accent: "text-white" };
  const themeEmoji = THEME_EMOJI[themeSlug] ?? "🌟";

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
      // Confetti at every 5 correct
      if (msg.totalCorrect > 0 && msg.totalCorrect % 5 === 0 && msg.totalCorrect !== lastMilestoneRef.current) {
        lastMilestoneRef.current = msg.totalCorrect;
        setShowConfetti(true);
        clearTimeout(confettiTimer.current);
        confettiTimer.current = setTimeout(() => setShowConfetti(false), 1500);
      }
    } else if (msg.type === "advance_target") {
      setVisual((prev) => ({ ...prev, targetLabel: msg.nextLabel, promptState: "listen" }));
    } else if (msg.type === "session_milestone") {
      setShowMilestone({ tier: msg.tier, masteryPct: msg.masteryPct });
      clearTimeout(milestoneTimer.current);
      milestoneTimer.current = setTimeout(() => setShowMilestone(null), 3000);
    } else if (msg.type === "agent_status") {
      setSlpSpeaking(msg.status === "paused");
    }
  }, []);

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
      .then(({ token, serverUrl }) => { setToken(token); setServerUrl(serverUrl); })
      .catch(() => setFetchError(true));
  }, [runtimeSession.roomMetadata, runtimeSession.roomName, runtimeSession.tokenPath]);

  // Connection timeout
  useEffect(() => {
    if (fetchError) {
      toast.error("Couldn't reach speech coach", { description: "Check your internet connection and try again." });
      onEndRef.current();
      return;
    }
    const timeout = setTimeout(() => {
      if (!wasConnected.current) {
        toast.error("Couldn't reach speech coach", { description: "Check your internet connection and try again." });
        onEndRef.current();
      }
    }, 15_000);
    return () => clearTimeout(timeout);
  }, [fetchError]);

  // Auto-stop after duration
  useEffect(() => {
    const timeout = setTimeout(() => onEndRef.current(), durationMinutes * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [durationMinutes]);

  const promptConfig = PROMPT_STATE_CONFIG[visual.promptState];

  const { filled: trailFilled } = useProgressTrail(visual.totalCorrect);

  // Clinical panel data for SLP view
  const sessionAccuracy =
    visual.totalCorrect > 0
      ? Math.round((visual.totalCorrect / Math.max(visual.totalCorrect + 1, 1)) * 100)
      : 0;
  const rollingCorrect = trailFilled;
  const rollingTotal = Math.min(visual.totalCorrect + (5 - trailFilled), 5);

  const sessionContent = (
    <div className={cn("relative flex h-full flex-col overflow-hidden", viewerRole === "slp" && "min-w-0")}>
      {/* LiveKit room */}
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
            if (wasConnected.current) {
              toast.error("Session disconnected", {
                description: "The connection was lost. Your progress has been saved.",
              });
              onEndRef.current();
            }
          }}
        >
          <RoomAudioRenderer />
          <AgentDataListener onMessage={handleAgentMessage} />
          <LiveKitPublisher publishRef={publishRef} />
        </LiveKitRoom>
      )}

      {/* Confetti overlay */}
      {showConfetti && !reducedMotion && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 animate-confetti-burst" />
      )}

      {/* Milestone overlay */}
      {showMilestone && (
        <div
          aria-live="polite"
          className={cn(
            "absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 pointer-events-none",
            !reducedMotion && "animate-in fade-in duration-300"
          )}
        >
          <div className="rounded-3xl bg-white/90 px-8 py-6 shadow-xl text-center">
            <p className="text-4xl mb-2" aria-hidden="true">🎉</p>
            <p className="font-headline text-xl font-bold text-foreground">
              {showMilestone.tier.charAt(0).toUpperCase() + showMilestone.tier.slice(1)} tier unlocked!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {Math.round(showMilestone.masteryPct * 100)}% mastery
            </p>
          </div>
        </div>
      )}

      {/* SLP speaking badge */}
      {slpSpeaking && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 shadow">
          SLP is speaking
        </div>
      )}

      {/* Top — World strip */}
      <div className={cn("flex items-center gap-3 px-4 py-3 bg-gradient-to-r text-white", themeColors.banner)}>
        <span className="text-2xl" aria-hidden="true">{themeEmoji}</span>
        <div className="flex-1">
          <p className={cn("text-xs font-medium uppercase tracking-wide opacity-80", themeColors.accent)}>
            Adventure Mode
          </p>
          <p className="text-sm font-semibold leading-tight">
            {sessionConfig?.themeSlug
              ? sessionConfig.themeSlug.charAt(0).toUpperCase() + sessionConfig.themeSlug.slice(1)
              : "Adventure"}
          </p>
        </div>
        {/* Stop button — top right, small */}
        <Button
          onClick={() => onEndRef.current()}
          variant="ghost"
          size="sm"
          className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 p-0 rounded-full"
          aria-label="Stop session"
        >
          ✕
        </Button>
      </div>

      {/* Center — Stage */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-6">
        <div className="w-full max-w-sm flex flex-col items-center gap-4">
          {/* Target image card */}
          <div className="w-full rounded-3xl bg-background p-6 shadow-sm">
            <div className="flex flex-col items-center gap-4">
              <div
                className={cn(
                  "flex h-44 w-44 items-center justify-center overflow-hidden rounded-3xl bg-muted/40",
                  !reducedMotion && "transition-all duration-300",
                  isConnected ? "opacity-100" : "opacity-50",
                  FEEDBACK_RING_CLASS[visual.promptState],
                )}
              >
                {visual.targetVisualUrl ? (
                  <Image
                    src={visual.targetVisualUrl}
                    alt={visual.targetLabel}
                    width={176}
                    height={176}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-headline text-4xl text-foreground">{visual.targetLabel}</span>
                )}
              </div>
              <p className="font-headline text-2xl text-foreground text-center">{visual.targetLabel}</p>
              {!isConnected && (
                <p className="text-xs text-muted-foreground/60">Connecting…</p>
              )}
            </div>
          </div>

          {/* Prompt state bubble */}
          <div
            className={cn(
              "w-full rounded-2xl px-4 py-3 text-center",
              promptConfig.bg,
              !reducedMotion && "transition-all duration-300"
            )}
          >
            <p className={cn("font-body text-base font-semibold", promptConfig.text)}>
              {promptConfig.label}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom — Progress trail */}
      <div className="px-4 pb-6">
        <div
          className="flex items-center gap-1.5 justify-center py-2"
          aria-label={`${trailFilled} of 5 attempts`}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cn(
                "h-3 w-3 rounded-full flex-shrink-0",
                !reducedMotion && "transition-all duration-300",
                i < trailFilled ? "bg-primary shadow-sm shadow-primary/40" : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      {/* Caregiver overlay — hint and boost buttons */}
      {viewerRole === "caregiver" && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 rounded-2xl bg-muted/30 px-4 py-3">
            <p className="flex-1 text-sm text-muted-foreground">
              Tap <strong className="text-foreground">Hint</strong> if they're stuck,{" "}
              <strong className="text-foreground">Boost</strong> if they need encouragement.
            </p>
            <button
              type="button"
              onClick={() => publishRef.current?.publish({ type: "hint_requested" })}
              className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              aria-label="Request a hint from the coach"
            >
              Hint
            </button>
            <button
              type="button"
              onClick={() => publishRef.current?.publish({ type: "boost_requested" })}
              className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-200 transition-colors"
              aria-label="Request an encouragement boost from the coach"
            >
              Boost
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return viewerRole === "slp" ? (
    <div className="flex h-full gap-0">
      {/* Left — child view mirror */}
      <div className="flex-[3] min-w-0 border-r border-border">
        {sessionContent}
      </div>

      {/* Right — live clinical panel */}
      <div className="flex-[2] min-w-0 flex flex-col gap-4 p-4 overflow-y-auto bg-muted/20">
        <h3 className="font-headline text-sm font-semibold text-foreground">Live Clinical Panel</h3>

        {/* Current target */}
        <div className="rounded-xl bg-background p-3 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Current target</p>
          <p className="mt-1 font-mono text-base font-bold text-foreground">{visual.targetLabel}</p>
          <p className="text-xs text-muted-foreground capitalize">{visual.promptState.replace("_", " ")}</p>
        </div>

        {/* Rolling accuracy window */}
        <div className="rounded-xl bg-background p-3 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Rolling window (last 5)</p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {rollingCorrect}/{Math.min(visual.totalCorrect + 1, 5)} correct
          </p>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2 flex-1 rounded-full",
                  i < trailFilled ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        {/* Session totals */}
        <div className="rounded-xl bg-background p-3 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Session total</p>
          <p className="mt-1 text-lg font-bold text-foreground">{visual.totalCorrect} correct</p>
        </div>

        {/* Take Over button */}
        <div className="mt-auto">
          {slpTakeOverActive ? (
            <button
              type="button"
              onClick={() => {
                setSlpTakeOverActive(false);
                publishRef.current?.publish({ type: "agent_status", status: "active" });
              }}
              className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
            >
              Resume Agent
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSlpTakeOverActive(true);
                publishRef.current?.publish({ type: "agent_status", status: "paused" });
              }}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Take Over
            </button>
          )}
          {slpTakeOverActive && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Agent paused — you are speaking directly to the child.
            </p>
          )}
        </div>
      </div>
    </div>
  ) : (
    sessionContent
  );
}
