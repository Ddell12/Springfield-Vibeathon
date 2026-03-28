"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { cn } from "@/core/utils";
import { useGoalWithProgress } from "../hooks/use-goals";
import { GoalForm } from "./goal-form";
import { GoalMetBanner } from "./goal-met-banner";
import { ProgressReportGenerator } from "./progress-report-generator";
import { ProgressChart } from "./progress-chart";
import { ProgressDataTable } from "./progress-data-table";
import { domainLabel, domainColor, statusBadgeColor, checkGoalMetClient } from "../lib/goal-utils";
import type { Id } from "../../../../convex/_generated/dataModel";

interface GoalDetailProps {
  patientId: string;
  goalId: string;
}

export function GoalDetail({ patientId, goalId }: GoalDetailProps) {
  const result = useGoalWithProgress(goalId as Id<"goals">);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

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
  const isGoalMet = goal.status === "active" && checkGoalMetClient(
    goal.targetAccuracy,
    goal.targetConsecutiveSessions,
    progressData,
  );

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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{goal.shortDescription}</h1>
            <p className="text-sm text-muted-foreground">{goal.fullGoalText}</p>
            <p className="text-sm text-muted-foreground">
              Target: {goal.targetAccuracy}% across {goal.targetConsecutiveSessions} consecutive sessions
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>
            <MaterialIcon icon="auto_awesome" size="sm" />
            Generate Report
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <MaterialIcon icon="edit" size="sm" />
            Edit Goal
          </Button>
        </div>
      </div>

      {/* Goal met banner */}
      {isGoalMet && (
        <GoalMetBanner
          goalId={goal._id}
          targetAccuracy={goal.targetAccuracy}
          targetConsecutiveSessions={goal.targetConsecutiveSessions}
        />
      )}

      {/* Progress chart */}
      <div className="rounded-xl bg-surface-container p-6">
        <h3 className="mb-4 text-sm font-semibold">Progress Chart</h3>
        <ProgressChart data={progressData} targetAccuracy={goal.targetAccuracy} />
      </div>

      {/* Data table */}
      <div className="rounded-xl bg-surface-container p-6">
        <h3 className="mb-4 text-sm font-semibold">Data Points</h3>
        <ProgressDataTable data={progressData} />
      </div>

      {/* Edit dialog */}
      <GoalForm
        patientId={patientId as Id<"patients">}
        open={editOpen}
        onOpenChange={setEditOpen}
        editGoal={goal}
      />
      <ProgressReportGenerator
        patientId={patientId as Id<"patients">}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </div>
  );
}
