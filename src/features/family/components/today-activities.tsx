"use client";

import { useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useFamilyData } from "../hooks/use-family-data";
import { usePracticeLog } from "../hooks/use-practice-log";
import { isDueToday, frequencySortOrder } from "../lib/frequency-utils";
import type { Frequency } from "../lib/frequency-utils";
import { ActivityCard } from "./activity-card";
import { PracticeLogForm } from "./practice-log-form";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface TodayActivitiesProps {
  patientId: Id<"patients">;
}

export function TodayActivities({ patientId }: TodayActivitiesProps) {
  const { activePrograms, isLoading } = useFamilyData(patientId);
  const { logPractice, weeklyLogs } = usePracticeLog(patientId);

  const [selectedProgramId, setSelectedProgramId] =
    useState<Id<"homePrograms"> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  // Build a map: homeProgramId → times logged this week
  const weeklyCountMap = new Map<string, number>();
  if (weeklyLogs) {
    for (const log of weeklyLogs) {
      const key = log.homeProgramId as string;
      weeklyCountMap.set(key, (weeklyCountMap.get(key) ?? 0) + 1);
    }
  }

  // Build a set: homeProgramId values logged today
  const loggedTodaySet = new Set<string>();
  if (weeklyLogs) {
    for (const log of weeklyLogs) {
      if (log.date === today) {
        loggedTodaySet.add(log.homeProgramId as string);
      }
    }
  }

  if (isLoading || weeklyLogs === undefined) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-base font-semibold text-foreground">
          Today&apos;s Activities
        </p>
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    );
  }

  if (!activePrograms || activePrograms.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-base font-semibold text-foreground">
          Today&apos;s Activities
        </p>
        <p className="text-sm text-muted-foreground">
          No activities assigned yet.
        </p>
      </div>
    );
  }

  // Filter to programs due today, sorted by urgency
  const duePrograms = activePrograms
    .filter((program) => {
      const timesThisWeek = weeklyCountMap.get(program._id as string) ?? 0;
      return isDueToday(program.frequency as Frequency, timesThisWeek);
    })
    .sort(
      (a, b) =>
        frequencySortOrder(a.frequency as Frequency) -
        frequencySortOrder(b.frequency as Frequency)
    );

  const allDone =
    duePrograms.length > 0 &&
    duePrograms.every((p) => loggedTodaySet.has(p._id as string));

  const selectedProgram = selectedProgramId
    ? activePrograms.find((p) => p._id === selectedProgramId)
    : null;

  function openLogForm(programId: Id<"homePrograms">) {
    setSelectedProgramId(programId);
    setDialogOpen(true);
  }

  async function handleLogSubmit(data: {
    duration?: number;
    confidence?: number;
    notes?: string;
  }) {
    if (!selectedProgramId) return;
    await logPractice({
      homeProgramId: selectedProgramId,
      date: today,
      ...data,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-semibold text-foreground">
        Today&apos;s Activities
      </p>

      {duePrograms.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing due today — check back tomorrow!
        </p>
      ) : allDone ? (
        <div className="rounded-xl bg-success-container px-4 py-3 text-center">
          <p className="text-sm font-medium text-success">
            All done for today! ✓
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {duePrograms.map((program) => (
          <ActivityCard
            key={program._id as string}
            program={program}
            isLoggedToday={loggedTodaySet.has(program._id as string)}
            onLogPractice={() => openLogForm(program._id)}
            patientId={patientId}
          />
        ))}
      </div>

      <PracticeLogForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        programTitle={selectedProgram?.title ?? ""}
        onSubmit={handleLogSubmit}
      />
    </div>
  );
}
