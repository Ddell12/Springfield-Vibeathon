"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface EngagementSummaryProps {
  patientId: Id<"patients">;
}

/** Returns ISO date string (YYYY-MM-DD) for Monday of the current week */
function getMondayOfCurrentWeek(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  return monday.toISOString().slice(0, 10);
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysSinceLastLog(logs: Array<{ date: string }>): number {
  if (logs.length === 0) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sortedDates = logs
    .map((l) => l.date)
    .sort()
    .reverse();
  const lastDate = new Date(sortedDates[0]);
  lastDate.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function EngagementSummary({ patientId }: EngagementSummaryProps) {
  const { isAuthenticated } = useConvexAuth();

  const monday = getMondayOfCurrentWeek();
  const today = getTodayIso();

  const logs = useQuery(
    api.practiceLog.listByPatientDateRange,
    isAuthenticated ? { patientId, startDate: monday, endDate: today } : "skip"
  );

  if (logs === undefined) {
    return (
      <div className="rounded-lg bg-muted/40 px-4 py-3">
        <p className="text-xs text-muted-foreground">Loading practice data…</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-lg bg-muted/40 px-4 py-3">
        <p className="text-xs text-muted-foreground">No practice data yet</p>
      </div>
    );
  }

  // Days practiced this week (unique dates)
  const uniqueDates = new Set(logs.map((l: { date: string }) => l.date));
  const daysPracticed = uniqueDates.size;

  // Elapsed days since Monday (Mon=1 … Sun=7)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const elapsedDays = dayOfWeek === 0 ? 7 : dayOfWeek;

  // Average confidence (non-null values only)
  const confidenceValues = logs
    .map((l: { confidence?: number }) => l.confidence)
    .filter((c: number | undefined): c is number => c !== undefined && c !== null);
  const avgConfidence =
    confidenceValues.length > 0
      ? confidenceValues.reduce((sum: number, v: number) => sum + v, 0) / confidenceValues.length
      : null;

  // Check if no practice in 5+ days
  const stale = daysSinceLastLog(logs) >= 5;

  return (
    <div className="flex flex-col gap-2">
      {stale && (
        <div className="rounded-lg bg-amber-50 px-4 py-2.5 dark:bg-amber-950/30">
          <p className="text-xs font-medium text-on-caution-container">
            No practice logged recently
          </p>
        </div>
      )}
      <div className="rounded-lg bg-muted/40 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Parent practiced{" "}
          <span className="font-semibold text-foreground">{daysPracticed}/{elapsedDays}</span>{" "}
          days this week
          {avgConfidence !== null && (
            <>
              {" · "}Avg confidence:{" "}
              <span className="font-semibold text-foreground">
                {avgConfidence.toFixed(1)}/5
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
