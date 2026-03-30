"use client";

import { useConvexAuth,useQuery } from "convex/react";
import { useState } from "react";

import { cn } from "@/core/utils";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useSpeechSession } from "../hooks/use-speech-session";
import { ActiveSession } from "./active-session";
import { SessionConfig } from "./session-config";
import { SessionHistory } from "./session-history";

type Tab = "new" | "history";

type Props = {
  patientId: Id<"patients">;
  homeProgramId: Id<"homePrograms">;
};

export function SpeechCoachPage({ patientId, homeProgramId }: Props) {
  const { isAuthenticated } = useConvexAuth();
  const [activeTab, setActiveTab] = useState<Tab>("new");
  const session = useSpeechSession(homeProgramId);

  // Get the home program for config defaults
  const programs = useQuery(
    api.homePrograms.listByPatient,
    isAuthenticated ? { patientId } : "skip"
  );
  const program = programs?.find((p) => p._id === homeProgramId);

  // Get last recommendation for quick-start
  const progress = useQuery(
    api.speechCoach.getProgress,
    isAuthenticated ? { patientId } : "skip"
  );
  const lastRecommended = progress?.[progress.length - 1]?.recommendedNextFocus;

  if (!isAuthenticated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="font-headline text-2xl font-bold text-foreground">Speech Coach</h2>
        <p className="text-muted-foreground">Sign in to start a speech coaching session.</p>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Active session takes over the whole screen
  if (session.phase === "active" && session.signedUrl) {
    return (
      <ActiveSession
        signedUrl={session.signedUrl}
        onConversationStarted={(id) => session.markActive(id)}
        onEnd={() => session.endSession()}
        durationMinutes={session.durationMinutes}
      />
    );
  }

  // Post-session screen
  if (session.phase === "ending" || session.phase === "done") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
        <p className="text-4xl" aria-hidden="true">{"\uD83C\uDF89"}</p>
        <h2 className="font-headline text-2xl font-bold text-foreground">Great job!</h2>
        <p className="text-muted-foreground">
          {session.phase === "ending" ? "Reviewing the session..." : "Session complete!"}
        </p>
        {session.phase === "done" && (
          <button
            type="button"
            onClick={() => {
              session.reset();
              setActiveTab("history");
            }}
            className="text-sm font-medium text-primary underline"
          >
            View results
          </button>
        )}
      </div>
    );
  }

  // Error state
  if (session.phase === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="font-headline text-xl font-bold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">{session.error}</p>
        <button
          type="button"
          onClick={session.reset}
          className="text-sm font-medium text-primary underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Tab view
  const TABS: { id: Tab; label: string }[] = [
    { id: "new", label: "New Session" },
    { id: "history", label: "History" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="bg-surface-container-low px-6 pt-6 pb-4">
        <h1 className="font-headline text-2xl font-bold text-foreground">Speech Coach</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Interactive voice sessions to help practice speech sounds
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container-low px-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "new" && program.speechCoachConfig && (
          <div className="mx-auto max-w-lg p-6">
            <SessionConfig
              speechCoachConfig={program.speechCoachConfig}
              onStart={session.begin}
              lastRecommended={lastRecommended}
              isLoading={session.phase === "connecting"}
            />
          </div>
        )}
        {activeTab === "history" && <SessionHistory patientId={patientId} />}
      </div>
    </div>
  );
}
