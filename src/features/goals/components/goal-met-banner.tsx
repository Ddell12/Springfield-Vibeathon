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
    <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success-container p-4">
      <MaterialIcon icon="check_circle" className="text-success" />
      <div className="flex-1">
        <p className="text-sm font-medium text-on-success-container">
          Goal criteria met!
        </p>
        <p className="text-xs text-success">
          {targetAccuracy}% accuracy achieved across {targetConsecutiveSessions} consecutive sessions.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleConfirm}
        disabled={confirming}
        className="border-success/30 text-on-success-container hover:bg-success/10"
      >
        {confirming ? "Confirming..." : "Mark as Met"}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDismissed(true)}
        className="h-8 w-8 text-success"
        aria-label="Dismiss"
      >
        <MaterialIcon icon="close" size="sm" />
      </Button>
    </div>
  );
}
