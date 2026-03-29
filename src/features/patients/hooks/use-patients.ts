"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function usePatients(status?: string) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.patients.list, isAuthenticated ? (status ? { status } : {}) : "skip");
}

export function usePatient(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.patients.get, isAuthenticated ? { patientId } : "skip");
}

export function usePatientStats() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.patients.getStats, isAuthenticated ? {} : "skip");
}

export function usePatientActivity(patientId: Id<"patients">, limit?: number) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.activityLog.listByPatient, isAuthenticated ? { patientId, limit } : "skip");
}

export function usePatientMaterials(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.patientMaterials.listByPatient, isAuthenticated ? { patientId } : "skip");
}

export function useCaregiverLinks(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.caregivers.listByPatient, isAuthenticated ? { patientId } : "skip");
}
