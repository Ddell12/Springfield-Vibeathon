"use client";

import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type BillingStatus = "draft" | "finalized" | "billed";

export function useBillingRecords(status?: BillingStatus) {
  return useQuery(api.billingRecords.listBySlp, status ? { status } : {});
}

export function useBillingRecord(recordId: Id<"billingRecords"> | undefined) {
  return useQuery(
    api.billingRecords.get,
    recordId ? { recordId } : "skip",
  );
}

export function usePatientBillingRecords(patientId: Id<"patients"> | undefined) {
  return useQuery(
    api.billingRecords.listByPatient,
    patientId ? { patientId } : "skip",
  );
}

export function useUnbilledCount() {
  return useQuery(api.billingRecords.getUnbilledCount, {});
}

export function useBillingMutations() {
  const createRecord = useMutation(api.billingRecords.create);
  const updateRecord = useMutation(api.billingRecords.update);
  const finalizeRecord = useMutation(api.billingRecords.finalize);
  const markBilled = useMutation(api.billingRecords.markBilled);
  const removeRecord = useMutation(api.billingRecords.remove);

  return { createRecord, updateRecord, finalizeRecord, markBilled, removeRecord };
}
