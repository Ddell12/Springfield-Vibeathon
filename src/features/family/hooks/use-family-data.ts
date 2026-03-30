"use client";

import { useConvexAuth, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useFamilyData(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  const skip = !isAuthenticated ? ("skip" as const) : undefined;

  const activePrograms = useQuery(
    api.homePrograms.getActiveByPatient,
    skip ?? { patientId }
  );
  const streakData = useQuery(
    api.practiceLog.getStreakData,
    skip ?? { patientId }
  );
  const unreadCount = useQuery(
    api.patientMessages.getUnreadCount,
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
