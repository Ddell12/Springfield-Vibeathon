"use client";

import { useConvexAuth, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function useActiveGoals(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.goals.listActive, isAuthenticated ? { patientId } : "skip");
}
