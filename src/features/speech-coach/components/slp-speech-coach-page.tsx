"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { CoachSetupTab } from "./coach-setup-tab";

type Props = {
  patientId: Id<"patients">;
  homeProgramId: Id<"homePrograms">;
};

export function SlpSpeechCoachPage({ patientId, homeProgramId }: Props) {
  const { isAuthenticated } = useConvexAuth();
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const updateProgram = useMutation(api.homePrograms.update);
  const programs = useQuery(
    api.homePrograms.listByPatient,
    isAuthenticated ? { patientId } : "skip"
  );
  const program = programs?.find((currentProgram) => currentProgram._id === homeProgramId);

  async function handleSaveCoachSetup(config: NonNullable<typeof program>["speechCoachConfig"]) {
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

  if (!isAuthenticated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="font-headline text-2xl font-bold text-foreground">Speech Coach</h2>
        <p className="text-muted-foreground">Sign in to configure the speech coach.</p>
      </div>
    );
  }

  if (!program?.speechCoachConfig) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-headline text-2xl font-semibold text-on-surface">Speech Coach</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Configure the AI coach for this child.
        </p>
      </div>

      <div className="rounded-3xl bg-surface-container-lowest p-4 sm:p-6">
        <CoachSetupTab
          key={JSON.stringify(program.speechCoachConfig.coachSetup ?? null)}
          speechCoachConfig={program.speechCoachConfig}
          onSave={handleSaveCoachSetup}
          isSaving={isSavingSetup}
        />
      </div>
    </div>
  );
}
