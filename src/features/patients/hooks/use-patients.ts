"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function usePatients(status?: string) {
  return useQuery(api.patients.list, status ? { status } : {});
}

export function usePatient(patientId: Id<"patients">) {
  return useQuery(api.patients.get, { patientId });
}

export function usePatientStats() {
  return useQuery(api.patients.getStats, {});
}

export function usePatientActivity(patientId: Id<"patients">, limit?: number) {
  return useQuery(api.activityLog.listByPatient, { patientId, limit });
}

export function usePatientMaterials(patientId: Id<"patients">) {
  return useQuery(api.patientMaterials.listByPatient, { patientId });
}

export function useCaregiverLinks(patientId: Id<"patients">) {
  return useQuery(api.caregivers.listByPatient, { patientId });
}
