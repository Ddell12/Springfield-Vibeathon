"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { type SpeechCoachConfig } from "../lib/config";
import { ageRangeFromAge } from "../lib/config";
import { getSystemTemplate } from "../lib/system-templates";
import { PerPatientCoachSetup } from "./per-patient-coach-setup";
import { PracticeFrequencyPanel } from "./practice-frequency-panel";
import { QuickStartCards } from "./quick-start-cards";

type Props = {
  patientId: Id<"patients">;
  homeProgramId: Id<"homePrograms">;
};

export function SlpSpeechCoachPage({ patientId, homeProgramId }: Props) {
  const { isAuthenticated } = useConvexAuth();
  const [isSaving, setIsSaving] = useState(false);
  const ensureSystemTemplates = useMutation(api.speechCoachTemplates.ensureSystemTemplates);
  const updateProgram = useMutation(api.homePrograms.update);
  const programs = useQuery(
    api.homePrograms.listByPatient,
    isAuthenticated ? { patientId } : "skip"
  );
  const templates = useQuery(
    api.speechCoachTemplates.listMine,
    isAuthenticated ? {} : "skip"
  );
  const practiceFrequency = useQuery(
    api.speechCoachHistory.getPracticeFrequency,
    isAuthenticated ? { patientId } : "skip"
  );
  const progressTrend = useQuery(
    api.speechCoachHistory.getProgressTrend,
    isAuthenticated ? { patientId } : "skip"
  );
  const program = programs?.find((currentProgram) => currentProgram._id === homeProgramId);

  useEffect(() => {
    if (!isAuthenticated) return;
    void ensureSystemTemplates({});
  }, [ensureSystemTemplates, isAuthenticated]);

  async function handleSaveConfig(config: SpeechCoachConfig) {
    setIsSaving(true);
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
      setIsSaving(false);
    }
  }

  async function handleQuickStart(systemTemplateId: string) {
    const template = getSystemTemplate(systemTemplateId);
    if (!template) {
      toast.error("That starting point could not be loaded.");
      return;
    }

    const childAge = template.sessionDefaults.ageRange === "2-4" ? 4 : 6;

    await handleSaveConfig({
      targetSounds: ["/s/"],
      childAge,
      ageRange: ageRangeFromAge(childAge),
      defaultDurationMinutes: template.sessionDefaults.defaultDurationMinutes,
      coachSetup: undefined,
    });
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-muted-foreground">Sign in to configure the speech coach.</p>
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

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-headline text-2xl font-semibold text-on-surface">Speech Coach Setup</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Configure the AI coach for this child.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <PracticeFrequencyPanel frequency={practiceFrequency ?? null} />
        <AccuracyTrendPanel trend={progressTrend ?? []} />
      </div>

      <div className="mx-auto w-full max-w-2xl rounded-3xl bg-surface-container-lowest p-4 sm:p-6">
        {program.speechCoachConfig ? (
          <PerPatientCoachSetup
            key={JSON.stringify(program.speechCoachConfig)}
            speechCoachConfig={program.speechCoachConfig}
            templates={templates ?? []}
            onSave={handleSaveConfig}
            isSaving={isSaving}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-headline text-lg font-semibold text-foreground">
                Pick a starting point
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a coaching style for this child. You can customize it after.
              </p>
            </div>
            <QuickStartCards onSelect={handleQuickStart} />
          </div>
        )}
      </div>
    </div>
  );
}

function AccuracyTrendPanel({
  trend,
}: {
  trend: Array<{
    sound: string;
    position: "initial" | "medial" | "final" | "unknown";
    firstAccuracy: number;
    latestAccuracy: number;
    sessionCount: number;
  }>;
}) {
  const topTrend = trend.slice(0, 4);

  return (
    <div className="rounded-2xl bg-muted/20 p-4">
      <h4 className="font-body text-sm font-semibold text-foreground">
        Accuracy trend
      </h4>
      <p className="mt-1 text-sm text-muted-foreground">
        Session-over-session progress for the most recent targets.
      </p>

      {topTrend.length > 0 ? (
        <div className="mt-4 space-y-3">
          {topTrend.map((entry) => {
            const delta = entry.latestAccuracy - entry.firstAccuracy;
            const direction = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";

            return (
              <div key={`${entry.sound}-${entry.position}`} className="rounded-xl bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {entry.sound}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {entry.position}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {direction} {entry.firstAccuracy}% → {entry.latestAccuracy}%
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Over {entry.sessionCount} session{entry.sessionCount === 1 ? "" : "s"}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Trend data will appear after a few reviewed sessions.
        </p>
      )}
    </div>
  );
}
