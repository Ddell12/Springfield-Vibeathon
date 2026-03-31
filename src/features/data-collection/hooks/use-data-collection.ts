"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export type CueLevel = "independent" | "min-cue" | "mod-cue" | "max-cue";

export function useDataCollection(patientId: Id<"patients">) {
  const [activeTrialId, setActiveTrialId] = useState<Id<"sessionTrials"> | null>(null);
  const [activeCueLevel, setActiveCueLevel] = useState<CueLevel>("independent");

  const activeCollections = useQuery(api.sessionTrials.getActiveForPatient, { patientId });

  const startMutation = useMutation(api.sessionTrials.start);
  const recordTrialMutation = useMutation(api.sessionTrials.recordTrial);
  const endCollectionMutation = useMutation(api.sessionTrials.endCollection);

  const today = new Date().toISOString().slice(0, 10);

  const startCollection = useCallback(
    async (goalId: Id<"goals">) => {
      const trialId = await startMutation({ patientId, goalId, sessionDate: today });
      setActiveTrialId(trialId);
      return trialId;
    },
    [startMutation, patientId, today]
  );

  const recordTrial = useCallback(
    async (correct: boolean) => {
      if (!activeTrialId) return;
      await recordTrialMutation({
        trialId: activeTrialId,
        correct,
        cueLevel: activeCueLevel,
      });
    },
    [recordTrialMutation, activeTrialId, activeCueLevel]
  );

  const endCollection = useCallback(async () => {
    if (!activeTrialId) return;
    await endCollectionMutation({ trialId: activeTrialId });
    setActiveTrialId(null);
  }, [endCollectionMutation, activeTrialId]);

  const activeCollection =
    activeCollections?.find((c) => c._id === activeTrialId) ??
    activeCollections?.[0] ??
    null;

  const correctCount = activeCollection?.trials.filter((t) => t.correct).length ?? 0;
  const totalCount = activeCollection?.trials.length ?? 0;
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return {
    activeCollections: activeCollections ?? [],
    activeCollection,
    activeTrialId,
    setActiveTrialId,
    activeCueLevel,
    setActiveCueLevel,
    startCollection,
    recordTrial,
    endCollection,
    correctCount,
    totalCount,
    accuracy,
    today,
  };
}
