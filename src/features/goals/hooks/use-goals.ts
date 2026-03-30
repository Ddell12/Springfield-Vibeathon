"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useGoals(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.goals.list, isAuthenticated ? { patientId } : "skip");
}

export function useActiveGoals(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.goals.listActive, isAuthenticated ? { patientId } : "skip");
}

export function useGoal(goalId: Id<"goals"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.goals.get, isAuthenticated && goalId ? { goalId } : "skip");
}

export function useGoalWithProgress(goalId: Id<"goals"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.goals.getWithProgress, isAuthenticated && goalId ? { goalId } : "skip");
}

export function useCreateGoal() {
  return useMutation(api.goals.create);
}

export function useUpdateGoal() {
  return useMutation(api.goals.update);
}

export function useRemoveGoal() {
  return useMutation(api.goals.remove);
}
