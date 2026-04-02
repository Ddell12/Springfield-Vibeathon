"use client";

import { useConvexAuth, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function usePatient(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.patients.get, isAuthenticated ? { patientId } : "skip");
}
