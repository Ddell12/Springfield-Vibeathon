"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { cn } from "@/core/utils";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useStandaloneSpeechSession } from "../hooks/use-standalone-speech-session";
import { ActiveSession } from "./active-session";
import { ProgressCard } from "./progress-card";
import { SessionConfig } from "./session-config";
import { SessionHistory } from "./session-history";

type Tab = "new" | "history" | "coach-setup";

const DEFAULT_CONFIG = {
  targetSounds: ["/s/"],
  ageRange: "5-7" as const,
  defaultDurationMinutes: 5,
};

export function StandaloneSpeechCoachPage() {
  const user = useCurrentUser();
  const { isAuthenticated } = useConvexAuth();
  const [activeTab, setActiveTab] = useState<Tab>("new");
  const session = useStandaloneSpeechSession();
  const retryReview = useMutation(api.speechCoach.retryReview);
  const isSLP = user?.role !== "caregiver";

  const searchParams = useSearchParams();
  const previewTemplateId = searchParams.get("templateId");
  const isPreviewMode = searchParams.get("mode") === "preview";

  const previewTemplate = useQuery(
    api.speechCoachTemplates.getById,
    previewTemplateId ? { templateId: previewTemplateId as Id<"speechCoachTemplates"> } : "skip",
  );

  const speechCoachConfig = previewTemplate
    ? {
        targetSounds: DEFAULT_CONFIG.targetSounds,
        ageRange: previewTemplate.sessionDefaults.ageRange,
        defaultDurationMinutes: previewTemplate.sessionDefaults.defaultDurationMinutes,
      }
    : DEFAULT_CONFIG;

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
        speechCoachConfig={speechCoachConfig}
      />
    );
  }

  // Reviewing — transcript saved, AI analysis queued
  if (session.phase === "reviewing") {
    const serverStatus = session.sessionDetail?.session.status;
    const progress = session.sessionDetail?.progress;

    if (serverStatus === "analyzed" && progress) {
      return (
        <div className="flex flex-col gap-6 p-4 sm:p-8 max-w-2xl mx-auto w-full">
          <div>
            <p className="text-4xl mb-2" aria-hidden="true">🎉</p>
            <h2 className="font-headline text-2xl font-bold text-foreground">Session complete!</h2>
          </div>
          <ProgressCard progress={progress} />
          <button
            type="button"
            onClick={() => { session.reset(); setActiveTab("history"); }}
            className="text-sm font-medium text-primary underline self-start"
          >
            View full history
          </button>
        </div>
      );
    }

    if (serverStatus === "review_failed") {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="font-headline text-xl font-bold text-foreground">Review didn&apos;t complete</h2>
          <p className="text-sm text-muted-foreground">
            {session.sessionDetail?.session.analysisErrorMessage ?? "Something went wrong."}
          </p>
          {session.sessionId && (
            <button
              type="button"
              onClick={() => { void retryReview({ sessionId: session.sessionId! }); }}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
            >
              Retry review
            </button>
          )}
          <button
            type="button"
            onClick={() => { session.reset(); setActiveTab("history"); }}
            className="text-sm font-medium text-primary underline"
          >
            View session history
          </button>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <h2 className="font-headline text-2xl font-bold text-foreground">Reviewing the session...</h2>
        <p className="text-muted-foreground">Analyzing transcript. This takes about 30 seconds.</p>
        <button
          type="button"
          onClick={() => { session.reset(); setActiveTab("history"); }}
          className="text-sm font-medium text-primary underline"
        >
          Check back later in History
        </button>
      </div>
    );
  }

  // Ending — brief transition while the mutation fires
  if (session.phase === "ending") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
        <p className="text-4xl" aria-hidden="true">{"\uD83C\uDF89"}</p>
        <h2 className="font-headline text-2xl font-bold text-foreground">Great job!</h2>
        <p className="text-muted-foreground">Ending session…</p>
      </div>
    );
  }

  // Done — fallback for any legacy path that sets done directly
  if (session.phase === "done") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
        <p className="text-4xl" aria-hidden="true">{"\uD83C\uDF89"}</p>
        <h2 className="font-headline text-2xl font-bold text-foreground">Session complete!</h2>
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
        {isSLP && isPreviewMode ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Previewing this coach setup before assigning it to a child.
          </p>
        ) : null}
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
              speechCoachConfig={speechCoachConfig}
              onStart={session.begin}
              lastRecommended={lastRecommended}
              isLoading={session.phase === "connecting"}
              error={session.error ?? undefined}
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
