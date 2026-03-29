"use client";

import { useConvexAuth, useQuery } from "convex/react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// The generated API type may not yet include these modules if `npx convex dev`
// hasn't been re-run since they were added. Cast through `any` so TypeScript
// doesn't block compilation while we wait for the next generation cycle.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extendedApi = api as any;

export function useFamilyData(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  const skip = !isAuthenticated ? ("skip" as const) : undefined;

  const activePrograms = useQuery(
    extendedApi.homePrograms.getActiveByPatient,
    skip ?? { patientId }
  );
  const streakData = useQuery(
    extendedApi.practiceLog.getStreakData,
    skip ?? { patientId }
  );
  const unreadCount = useQuery(
    extendedApi.patientMessages.getUnreadCount,
    skip ?? { patientId }
  );

  return {
    activePrograms: activePrograms as
      | Array<{
          _id: Id<"homePrograms">;
          title: string;
          instructions: string;
          frequency: string;
          status: string;
        }>
      | undefined,
    streakData: streakData as
      | {
          currentStreak: number;
          weeklyPracticeDays: number;
          weeklyTarget: number;
        }
      | undefined,
    unreadCount: unreadCount as number | undefined,
    isLoading: activePrograms === undefined || streakData === undefined,
  };
}
