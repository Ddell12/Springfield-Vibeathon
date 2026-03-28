"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { cn } from "@/core/utils";
import { useGoalWithProgress } from "../hooks/use-goals";
import { domainLabel, domainColor, statusBadgeColor } from "../lib/goal-utils";
import type { Id } from "../../../../convex/_generated/dataModel";

interface GoalDetailProps {
  patientId: string;
  goalId: string;
}

export function GoalDetail({ patientId, goalId }: GoalDetailProps) {
  const result = useGoalWithProgress(goalId as Id<"goals">);

  if (result === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (result === null) {
    notFound();
  }

  const { goal, progressData } = result;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/patients/${patientId}`}>
          <MaterialIcon icon="arrow_back" size="sm" />
          Back to Patient
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", domainColor(goal.domain))}>
            {domainLabel(goal.domain)}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusBadgeColor(goal.status))}>
            {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{goal.shortDescription}</h1>
        <p className="text-sm text-muted-foreground">{goal.fullGoalText}</p>
        <p className="text-sm text-muted-foreground">
          Target: {goal.targetAccuracy}% across {goal.targetConsecutiveSessions} consecutive sessions
        </p>
      </div>

      {/* Placeholder for progress chart — added in Phase 2 */}
      <div className="rounded-xl bg-surface-container p-6">
        <h3 className="mb-2 text-sm font-semibold">Progress</h3>
        {progressData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No progress data yet. Data will appear here when session notes with this goal are signed.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {progressData.length} data point{progressData.length !== 1 ? "s" : ""} recorded.
            Chart coming in Phase 2.
          </p>
        )}
      </div>
    </div>
  );
}
