"use client";

import { useUser } from "@clerk/nextjs";
import { useConvexAuth,useMutation,useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useSpeechSession } from "../hooks/use-speech-session";
import type { SpeechCoachConfig } from "../lib/config";
import { ActiveSession } from "./active-session";
import { CoachSetupTab } from "./coach-setup-tab";
import { SessionConfig } from "./session-config";
import { SessionHistory } from "./session-history";

type Tab = "new" | "history" | "coach-setup";

type Props = {
  patientId: Id<"patients">;
  homeProgramId: Id<"homePrograms">;
};

export function SpeechCoachPage({ patientId, homeProgramId }: Props) {
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const [activeTab, setActiveTab] = useState<Tab>("new");
  const session = useSpeechSession(homeProgramId);
  const updateProgram = useMutation(api.homePrograms.update);
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
  const isSLP = role !== "caregiver";

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
        sessionConfig={session.sessionConfig ?? undefined}
        speechCoachConfig={program.speechCoachConfig}
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

  const TABS: { id: Tab; label: string }[] = [
    { id: "new", label: "New Session" },
    { id: "history", label: "History" },
    ...(isSLP ? [{ id: "coach-setup" as const, label: "Coach Setup" }] : []),
  ];

  async function handleSaveCoachSetup(config: SpeechCoachConfig) {
    setIsSavingSetup(true);
    try {
      await updateProgram({
        id: homeProgramId,
        speechCoachConfig: config,
      });
      toast.success("Coach setup saved");
    } catch (error) {
      console.error("[SpeechCoach] Failed to save coach setup:", error);
      toast.error("Could not save coach setup");
    } finally {
      setIsSavingSetup(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-headline text-2xl font-semibold text-on-surface">Speech Coach</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Interactive voice sessions to help practice speech sounds.
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
        {activeTab === "new" && program.speechCoachConfig && (
          <div className="mx-auto max-w-lg">
            <SessionConfig
              speechCoachConfig={program.speechCoachConfig}
              onStart={session.begin}
              lastRecommended={lastRecommended}
              isLoading={session.phase === "connecting"}
            />
          </div>
        )}
        {activeTab === "history" ? <SessionHistory patientId={patientId} /> : null}
        {activeTab === "coach-setup" && program.speechCoachConfig ? (
          <CoachSetupTab
            key={JSON.stringify(program.speechCoachConfig.coachSetup ?? null)}
            speechCoachConfig={program.speechCoachConfig}
            onSave={handleSaveCoachSetup}
            isSaving={isSavingSetup}
          />
        ) : null}
      </div>
    </div>
  );
}
