"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";
import { useFamilyData } from "../hooks/use-family-data";
import { StreakTracker } from "./streak-tracker";
import { WeeklyProgress } from "./weekly-progress";
import { CelebrationCard } from "./celebration-card";
import { TodayActivities } from "./today-activities";

interface FamilyDashboardProps {
  paramsPromise: Promise<{ patientId: string }>;
}

export function FamilyDashboard({ paramsPromise }: FamilyDashboardProps) {
  const { patientId } = use(paramsPromise);
  const { isAuthenticated } = useConvexAuth();

  const patient = useQuery(
    api.patients.get,
    isAuthenticated ? { patientId: patientId as Id<"patients"> } : "skip"
  );

  const goals = useQuery(
    api.goals.listByPatient,
    isAuthenticated ? { patientId: patientId as Id<"patients"> } : "skip"
  );

  const { streakData, unreadCount, isLoading } = useFamilyData(
    patientId as Id<"patients">
  );

  // Loading state
  if (patient === undefined || isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
    );
  }

  const childName = patient?.firstName ?? "your child";
  const metGoals = goals?.filter((g: { status: string }) => g.status === "met") ?? [];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="font-headline text-2xl font-bold text-foreground">
          {patient ? `${patient.firstName}'s Practice` : "Practice Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track progress and stay connected with the therapy team.
        </p>
      </div>

      {/* Celebration card (conditionally rendered) */}
      {streakData && (
        <CelebrationCard
          childName={childName}
          currentStreak={streakData.currentStreak}
          goals={metGoals.map((g: { status: string; shortDescription: string }) => ({
            status: g.status,
            shortDescription: g.shortDescription,
          }))}
        />
      )}

      {/* Streak tracker */}
      {streakData ? (
        <StreakTracker streakData={streakData} />
      ) : (
        <Skeleton className="h-28 rounded-xl" />
      )}

      <Separator />

      {/* Today's Activities */}
      <TodayActivities patientId={patientId as Id<"patients">} />

      <Separator />

      {/* Weekly progress */}
      {streakData ? (
        <WeeklyProgress
          weeklyPracticeDays={streakData.weeklyPracticeDays}
          weeklyTarget={streakData.weeklyTarget}
        />
      ) : (
        <Skeleton className="h-10 rounded-full" />
      )}

      {/* Messages link */}
      <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Therapist messages</p>
          {unreadCount !== undefined && unreadCount > 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Stay in touch with your team</p>
          )}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/family/${patientId}/messages`}>Message Therapist</Link>
        </Button>
      </div>
    </div>
  );
}
