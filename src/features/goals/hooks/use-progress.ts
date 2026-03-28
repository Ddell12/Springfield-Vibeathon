"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useProgressByGoal(goalId: Id<"goals"> | null) {
  return useQuery(api.progressData.listByGoal, goalId ? { goalId } : "skip");
}

export function useProgressByPatient(
  patientId: Id<"patients"> | null,
  periodStart: string,
  periodEnd: string,
) {
  return useQuery(
    api.progressData.listByPatient,
    patientId ? { patientId, periodStart, periodEnd } : "skip"
  );
}

export function useCreateManualProgress() {
  return useMutation(api.progressData.createManual);
}
