"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { useUpdateGoal } from "../hooks/use-goals";
import type { Id } from "../../../../convex/_generated/dataModel";

interface GoalMetBannerProps {
  goalId: Id<"goals">;
  targetAccuracy: number;
  targetConsecutiveSessions: number;
}

export function GoalMetBanner({
  goalId,
  targetAccuracy,
  targetConsecutiveSessions,
}: GoalMetBannerProps) {
  const updateGoal = useUpdateGoal();
  const [confirming, setConfirming] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleConfirm() {
    setConfirming(true);
    try {
      await updateGoal({ goalId, status: "met" as const });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
      <MaterialIcon icon="check_circle" className="text-green-600 dark:text-green-400" />
      <div className="flex-1">
        <p className="text-sm font-medium text-green-800 dark:text-green-200">
          Goal criteria met!
        </p>
        <p className="text-xs text-green-600 dark:text-green-400">
          {targetAccuracy}% accuracy achieved across {targetConsecutiveSessions} consecutive sessions.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleConfirm}
        disabled={confirming}
        className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300"
      >
        {confirming ? "Confirming..." : "Mark as Met"}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDismissed(true)}
        className="h-8 w-8 text-green-600"
        aria-label="Dismiss"
      >
        <MaterialIcon icon="close" size="sm" />
      </Button>
    </div>
  );
}
