"use client";

import {
  ParticipantTile,
  TrackLoop,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

type ParticipantPanelProps = {
  className?: string;
};

export function ParticipantPanel({ className }: ParticipantPanelProps) {
  // Get all camera tracks, including placeholders for participants without video
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  const participantCount = new Set(tracks.map(t => t.participant.identity)).size;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-stone-900",
        className,
      )}
    >
      {tracks.length === 0 ? (
        /* Empty state — waiting for participants */
        <div className="flex h-full min-h-[300px] items-center justify-center">
          <div className="text-center">
            <div className="mb-2 flex justify-center">
              <MaterialIcon icon="videocam_off" size="lg" className="text-stone-500" />
            </div>
            <p className="text-sm text-stone-400 font-body">
              Waiting for participants…
            </p>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "grid h-full gap-2 p-2",
            tracks.length === 1 && "grid-cols-1",
            tracks.length === 2 && "grid-cols-2",
            tracks.length >= 3 && "grid-cols-2 sm:grid-cols-3",
          )}
        >
          <TrackLoop tracks={tracks}>
            <ParticipantTile className="overflow-hidden rounded-lg" />
          </TrackLoop>
        </div>
      )}

      {/* Participant count badge */}
      {participantCount > 0 && (
        <div className="absolute left-3 top-3">
          <span
            className="rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur-sm font-body"
          >
            {participantCount}{" "}
            {participantCount === 1 ? "participant" : "participants"}
          </span>
        </div>
      )}
    </div>
  );
}
