"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import type { Id } from "../../../../convex/_generated/dataModel";
import { useActiveGoals } from "../hooks/use-goals";
import { domainColor,domainLabel } from "../lib/goal-utils";
import { GoalForm } from "./goal-form";

interface GoalsListProps {
  patientId: Id<"patients">;
}

export function GoalsList({ patientId }: GoalsListProps) {
  const goals = useActiveGoals(patientId);
  const [formOpen, setFormOpen] = useState(false);

  if (goals === undefined) {
    return (
      <div className="rounded-xl bg-surface-container p-4">
        <p className="text-sm text-on-surface-variant">Loading goals...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface-container p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-on-surface">Goals</h3>
        <Button variant="ghost" size="sm" onClick={() => setFormOpen(true)}>
          <MaterialIcon icon="add" size="sm" />
          Add Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          No goals yet — add IEP goals to track progress
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {goals.map((goal) => (
            <Link
              key={goal._id}
              href={`/patients/${patientId}/goals/${goal._id}`}
              className={cn(
                "flex items-center gap-3 rounded-lg p-3 transition-colors duration-300",
                "hover:bg-muted/50",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
              )}
            >
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", domainColor(goal.domain))}>
                {domainLabel(goal.domain)}
              </span>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{goal.shortDescription}</span>
                <span className="text-xs text-muted-foreground">
                  Target: {goal.targetAccuracy}%
                </span>
              </div>
              <MaterialIcon icon="chevron_right" size="sm" className="text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      <GoalForm patientId={patientId} open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
