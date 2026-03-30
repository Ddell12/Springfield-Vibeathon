"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useProgressByGoal(goalId: Id<"goals"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.progressData.listByGoal, isAuthenticated && goalId ? { goalId } : "skip");
}

export function useProgressByPatient(
  patientId: Id<"patients"> | null,
  periodStart: string,
  periodEnd: string,
) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.progressData.listByPatient,
    isAuthenticated && patientId ? { patientId, periodStart, periodEnd } : "skip"
  );
}

export function useCreateManualProgress() {
  return useMutation(api.progressData.createManual);
}
