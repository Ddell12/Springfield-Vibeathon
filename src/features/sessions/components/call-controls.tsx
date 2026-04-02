"use client";

import { DisconnectButton, TrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

type CallControlsProps = {
  className?: string;
};

export function CallControls({ className }: CallControlsProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 rounded-xl bg-stone-900 px-4 py-3",
        className,
      )}
    >
      {/* Microphone toggle */}
      <TrackToggle
        source={Track.Source.Microphone}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full",
          "bg-stone-700 text-white transition-colors duration-200",
          "hover:bg-stone-600",
          // LiveKit adds data-lk-enabled; style the muted state
          "data-[lk-enabled=false]:bg-red-600 data-[lk-enabled=false]:hover:bg-red-700",
        )}
        showIcon={false}
      >
        <MaterialIcon icon="mic" size="sm" />
      </TrackToggle>

      {/* Camera toggle */}
      <TrackToggle
        source={Track.Source.Camera}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full",
          "bg-stone-700 text-white transition-colors duration-200",
          "hover:bg-stone-600",
          "data-[lk-enabled=false]:bg-red-600 data-[lk-enabled=false]:hover:bg-red-700",
        )}
        showIcon={false}
      >
        <MaterialIcon icon="videocam" size="sm" />
      </TrackToggle>

      {/* Spacer */}
      <div className="mx-2 h-6 w-px bg-stone-600" aria-hidden="true" />

      {/* End call */}
      <DisconnectButton
        className={cn(
          "flex h-11 items-center gap-2 rounded-full bg-red-600 px-5",
          "text-sm font-medium text-white transition-colors duration-200",
          "hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-red-500 focus-visible:ring-offset-2",
        )}
      >
        <MaterialIcon icon="call_end" size="sm" />
        <span className="font-body">
          End call
        </span>
      </DisconnectButton>
    </div>
  );
}
