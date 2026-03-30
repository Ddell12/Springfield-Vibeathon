"use client";

import "@livekit/components-styles";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import type { LocalUserChoices } from "@livekit/components-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCallRoom } from "../hooks/use-call-room";
import { useInteractiveSync } from "../hooks/use-interactive-sync";
import { Lobby } from "./lobby";
import { ParticipantPanel } from "./participant-panel";
import { CallControls } from "./call-controls";

type CallRoomProps = {
  appointmentId: string;
  onCallEnd: (durationSeconds: number, interactionLog: string) => void;
};

export function CallRoom({ appointmentId, onCallEnd }: CallRoomProps) {
  const { callState, token, serverUrl, fetchToken, getDurationSeconds, handleDisconnected } =
    useCallRoom(appointmentId);

  const [userChoices, setUserChoices] = useState<LocalUserChoices | null>(null);
  const getInteractionLogRef = useRef<() => string>(() => "{}");

  // Handles PreJoin submit — fetches token then transitions to the room
  const handleJoin = useCallback(async (choices: LocalUserChoices) => {
    setUserChoices(choices);
    await fetchToken();
  }, [fetchToken]);

  const handleDisconnect = useCallback(() => {
    handleDisconnected();
    onCallEnd(getDurationSeconds(), getInteractionLogRef.current());
  }, [handleDisconnected, onCallEnd, getDurationSeconds]);

  const handleGetInteractionLog = useCallback((fn: () => string) => {
    getInteractionLogRef.current = fn;
  }, []);

  // Show lobby until we have a valid token and serverUrl
  if (callState === "idle" || callState === "connecting" || !token || !serverUrl) {
    return (
      <Lobby
        onJoin={handleJoin}
        isConnecting={callState === "connecting"}
      />
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={userChoices?.audioEnabled ?? true}
      video={userChoices?.videoEnabled ?? true}
      onDisconnected={handleDisconnect}
      className="flex min-h-screen flex-col bg-[#F6F3EE]"
    >
      <RoomContent
        onGetInteractionLog={handleGetInteractionLog}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

// Separate inner component so hooks that require RoomContext work correctly
function RoomContent({
  onGetInteractionLog,
}: {
  onGetInteractionLog: (fn: () => string) => void;
}) {
  // useInteractiveSync must be inside LiveKitRoom for data channel access
  const { getInteractionLog } = useInteractiveSync();

  // Register the getter with the parent on mount so handleDisconnect can read it
  useEffect(() => {
    onGetInteractionLog(getInteractionLog);
  }, [getInteractionLog, onGetInteractionLog]);

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
      {/* Main video area — 2/3 width on desktop */}
      <div className="flex flex-col gap-3 lg:col-span-2">
        <div className="min-h-[320px] flex-1">
          <ParticipantPanel className="h-full" />
        </div>
        <CallControls />
      </div>

      {/* Interactive panel placeholder — 1/3 width on desktop (Task 14) */}
      <div className="lg:col-span-1">
        <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white">
          <p
            className="text-sm text-stone-400 font-body"
          >
            Interactive panel coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
