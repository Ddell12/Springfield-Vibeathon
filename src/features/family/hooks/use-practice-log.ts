"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function usePracticeLog(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  const logPractice = useMutation(api.practiceLog.log);

  const today = new Date().toISOString().slice(0, 10);
  const monday = getMonday(new Date()).toISOString().slice(0, 10);

  const weeklyLogs = useQuery(
    api.practiceLog.listByPatientDateRange,
    isAuthenticated ? { patientId, startDate: monday, endDate: today } : "skip"
  ) as
    | Array<{
        _id: Id<"practiceLog">;
        homeProgramId: Id<"homePrograms">;
        patientId: Id<"patients">;
        date: string;
        duration?: number;
        confidence?: number;
        notes?: string;
      }>
    | undefined;

  return { logPractice, weeklyLogs };
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(monday.getDate() - diff);
  return monday;
}
