"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";

import type { Id } from "../../../../convex/_generated/dataModel";

export function usePlanOfCare(pocId: Id<"plansOfCare"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    anyApi.plansOfCare.get,
    isAuthenticated && pocId ? { pocId } : "skip"
  );
}

export function useActivePlanOfCare(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    anyApi.plansOfCare.getActiveByPatient,
    isAuthenticated ? { patientId } : "skip"
  );
}

export function usePlansOfCareHistory(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    anyApi.plansOfCare.getByPatient,
    isAuthenticated ? { patientId } : "skip"
  );
}

export function useCreatePlanOfCare() {
  return useMutation(anyApi.plansOfCare.create);
}

export function useUpdatePlanOfCare() {
  return useMutation(anyApi.plansOfCare.update);
}

export function useSignPlanOfCare() {
  return useMutation(anyApi.plansOfCare.sign);
}

export function useAmendPlanOfCare() {
  return useMutation(anyApi.plansOfCare.amend);
}
