"use client";

import { useMutation, useConvexAuth, useQuery } from "convex/react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// The generated API type may not yet include these modules if `npx convex dev`
// hasn't been re-run since they were added. Cast through `any` so TypeScript
// doesn't block compilation while we wait for the next generation cycle.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extendedApi = api as any;

export function usePracticeLog(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  const logPractice = useMutation(extendedApi.practiceLog.log);

  const today = new Date().toISOString().slice(0, 10);
  const monday = getMonday(new Date()).toISOString().slice(0, 10);

  const weeklyLogs = useQuery(
    extendedApi.practiceLog.listByPatientDateRange,
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
