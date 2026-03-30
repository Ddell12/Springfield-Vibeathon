import type { GenericDatabaseWriter } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

interface DataPoint {
  accuracy: number;
  date: string;
}

interface TargetWithGoal {
  goalId?: string;
  trials?: number;
  correct?: number;
  promptLevel?: "independent" | "verbal-cue" | "model" | "physical";
  notes?: string;
}

/**
 * Count consecutive sessions (most recent first) where accuracy >= target.
 * Stops at the first session below target.
 */
export function calculateStreak(
  dataPoints: DataPoint[],
  targetAccuracy: number,
): number {
  let streak = 0;
  for (const dp of dataPoints) {
    if (dp.accuracy >= targetAccuracy) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Detect trend using simple linear regression on accuracy values.
 * Requires 5+ data points; returns "stable" if fewer.
 * dataPoints should be sorted most-recent-first (we reverse internally).
 */
export function detectTrend(
  dataPoints: DataPoint[],
): "improving" | "stable" | "declining" {
  if (dataPoints.length < 5) return "stable";

  const chronological = [...dataPoints].reverse();
  const n = chronological.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += chronological[i].accuracy;
    sumXY += i * chronological[i].accuracy;
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  if (slope > 1) return "improving";
  if (slope < -1) return "declining";
  return "stable";
}

/**
 * Check if a goal's criteria have been met.
 */
export function checkGoalMet(
  targetAccuracy: number,
  targetConsecutiveSessions: number,
  dataPoints: DataPoint[],
): boolean {
  const streak = calculateStreak(dataPoints, targetAccuracy);
  return streak >= targetConsecutiveSessions;
}

/**
 * Insert progressData rows from signed session note targets.
 * Runs inline within the sessionNotes.sign mutation transaction.
 * Skips targets without goalId, or without both trials and correct.
 * Skips targets whose goalId points to a non-existent or discontinued goal.
 */
export async function insertProgressFromTargets(
  db: GenericDatabaseWriter<DataModel>,
  targets: TargetWithGoal[],
  noteId: Id<"sessionNotes">,
  patientId: Id<"patients">,
  sessionDate: string,
): Promise<void> {
  const now = Date.now();
  for (const target of targets) {
    if (!target.goalId) continue;
    if (target.trials === undefined || target.correct === undefined) continue;
    if (target.trials === 0) continue;

    const goal = await db.get(target.goalId as Id<"goals">);
    if (!goal || goal.patientId !== patientId) continue;
    if (goal.status === "discontinued") continue;

    const accuracy = Math.round((target.correct / target.trials) * 100);

    await db.insert("progressData", {
      goalId: target.goalId as Id<"goals">,
      patientId,
      source: "session-note",
      sourceId: noteId as string,
      date: sessionDate,
      trials: target.trials,
      correct: target.correct,
      accuracy,
      promptLevel: target.promptLevel,
      notes: target.notes,
      timestamp: now,
    });
  }
}
