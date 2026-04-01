"use client";

import { useUser } from "@clerk/nextjs";
import { useConvexAuth,useQuery } from "convex/react";
import { useState } from "react";

import { cn } from "@/core/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

import { api } from "../../../../convex/_generated/api";
import { useStandaloneSpeechSession } from "../hooks/use-standalone-speech-session";
import { ActiveSession } from "./active-session";
import { SessionConfig } from "./session-config";
import { SessionHistory } from "./session-history";

type Tab = "new" | "history" | "coach-setup";

const DEFAULT_CONFIG = {
  targetSounds: ["/s/"],
  ageRange: "5-7" as const,
  defaultDurationMinutes: 5,
};

export function StandaloneSpeechCoachPage() {
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const [activeTab, setActiveTab] = useState<Tab>("new");
  const session = useStandaloneSpeechSession();
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
  const isSLP = role !== "caregiver";

  const progress = useQuery(
    api.speechCoach.getStandaloneProgress,
    isAuthenticated ? {} : "skip"
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

  // Active session takes over the whole screen
  if (session.phase === "active" && session.runtimeSession) {
    return (
      <ActiveSession
        runtimeSession={session.runtimeSession}
        onConversationStarted={(id) => session.markActive(id)}
        onEnd={() => session.endSession()}
        durationMinutes={session.durationMinutes}
        sessionConfig={session.sessionConfig ?? undefined}
        speechCoachConfig={DEFAULT_CONFIG}
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
    ...(isSLP ? [{ id: "coach-setup" as const, label: "Coach Setup" }] : []),
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-headline text-2xl font-semibold text-on-surface">Speech Coach</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Try an interactive voice session and practice speech sounds with an AI coach.
        </p>
      </div>

      <div className="flex gap-1 rounded-full bg-surface-container p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-white text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl bg-surface-container-lowest p-4 sm:p-6">
        {activeTab === "new" && (
          <div className="mx-auto max-w-lg">
            <SessionConfig
              speechCoachConfig={DEFAULT_CONFIG}
              onStart={session.begin}
              lastRecommended={lastRecommended}
              isLoading={session.phase === "connecting"}
            />
          </div>
        )}
        {activeTab === "history" ? <SessionHistory mode="standalone" /> : null}
        {activeTab === "coach-setup" ? (
          <div className="mx-auto max-w-3xl">
            <Card className="rounded-xl py-5">
              <CardHeader className="gap-1 px-5">
                <CardTitle className="font-headline text-xl text-foreground">Coach Setup</CardTitle>
                <CardDescription>
                  Speech coach setup is saved per child, not as one global default.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5">
                <p className="text-sm leading-6 text-muted-foreground">
                  To customize how the coach talks, cues, and adapts for a specific child, open that child&apos;s Speech Coach program from the patient or family workflow. This standalone page stays focused on quick try-it-now sessions.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
