"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";

interface AmendmentEntry {
  previousGoalText: string;
  previousTargetAccuracy: number;
  previousTargetConsecutiveSessions: number;
  previousStatus: string;
  changedAt: number;
  changedBy: string;
  reason?: string;
}

interface GoalAmendmentHistoryProps {
  amendmentLog: AmendmentEntry[] | undefined;
}

export function GoalAmendmentHistory({ amendmentLog }: GoalAmendmentHistoryProps) {
  const [expanded, setExpanded] = useState(false);

  if (!amendmentLog || amendmentLog.length === 0) {
    return null;
  }

  const sorted = [...amendmentLog].sort((a, b) => b.changedAt - a.changedAt);

  return (
    <div className="mt-4 flex flex-col gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        onClick={() => setExpanded((e) => !e)}
      >
        <MaterialIcon icon="history" className="mr-1 text-base" />
        {expanded ? "Hide" : "Show"} amendment history ({amendmentLog.length})
      </Button>

      {expanded && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3">
          {sorted.map((entry, i) => (
            <div key={i} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {new Date(entry.changedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {entry.previousStatus}
                </span>
              </div>
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">Was: </span>
                {entry.previousGoalText}
              </p>
              <p className="text-xs text-muted-foreground">
                {entry.previousTargetAccuracy}% across {entry.previousTargetConsecutiveSessions} sessions
              </p>
              {entry.reason && (
                <p className="text-xs text-foreground">
                  <span className="font-medium">Reason: </span>{entry.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
