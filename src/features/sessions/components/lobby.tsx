"use client";

import { PreJoin } from "@livekit/components-react";
import type { LocalUserChoices } from "@livekit/components-react";

import { cn } from "@/core/utils";

type LobbyProps = {
  onJoin: (userChoices: LocalUserChoices) => void;
  isConnecting?: boolean;
};

export function Lobby({ onJoin, isConnecting = false }: LobbyProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F3EE] px-4 py-12">
      <style>{`
        .lk-join-button {
          background: linear-gradient(135deg, #00595c, #0d7377) !important;
          color: white !important;
          border: none !important;
          border-radius: 0.75rem !important;
          font-weight: 600 !important;
          padding: 0.625rem 1.25rem !important;
          width: 100% !important;
          cursor: pointer !important;
          transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1) !important;
        }
        .lk-join-button:hover { opacity: 0.9 !important; }
      `}</style>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1
            className="mb-2 text-3xl font-semibold tracking-tight text-[#00595c] font-headline"
          >
            Join Your Session
          </h1>
          <p
            className="text-base text-stone-500 font-body"
          >
            Check your camera and microphone before joining.
          </p>
        </div>

        {/* PreJoin card */}
        <div
          className={cn(
            "overflow-hidden rounded-2xl bg-white shadow-md transition-opacity duration-300",
            isConnecting && "pointer-events-none opacity-60",
          )}
        >
          <PreJoin
            onSubmit={onJoin}
            joinLabel={isConnecting ? "Connecting…" : "Join Session"}
            micLabel="Microphone"
            camLabel="Camera"
            userLabel="Display name"
            defaults={{ videoEnabled: true, audioEnabled: true }}
            className="p-6"
          />
        </div>

        {/* Reassurance note */}
        <p
          className="mt-6 text-center text-sm text-stone-400 font-body"
        >
          Your session is private and encrypted.
        </p>
      </div>
    </div>
  );
}
