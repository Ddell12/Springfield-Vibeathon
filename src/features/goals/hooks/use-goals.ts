"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useGoals(patientId: Id<"patients">) {
  return useQuery(api.goals.list, { patientId });
}

export function useActiveGoals(patientId: Id<"patients">) {
  return useQuery(api.goals.listActive, { patientId });
}

export function useGoal(goalId: Id<"goals"> | null) {
  return useQuery(api.goals.get, goalId ? { goalId } : "skip");
}

export function useGoalWithProgress(goalId: Id<"goals"> | null) {
  return useQuery(api.goals.getWithProgress, goalId ? { goalId } : "skip");
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
