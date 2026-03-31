"use client";

import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import type { Id } from "../../../../convex/_generated/dataModel";
import { useEvaluations } from "../hooks/use-evaluations";

interface EvaluationListProps {
  patientId: Id<"patients">;
}

export function EvaluationList({ patientId }: EvaluationListProps) {
  const evaluations = useEvaluations(patientId);

  if (evaluations === undefined) {
    return (
      <div className="rounded-xl bg-surface-container p-4">
        <p className="text-sm text-on-surface-variant">Loading evaluations...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface-container p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-on-surface">Evaluations</h3>
        <Button asChild size="sm">
          <Link href={`/patients/${patientId}/evaluations/new`}>
            <MaterialIcon icon="add" size="sm" className="mr-1" />
            New Evaluation
          </Link>
        </Button>
      </div>

      {evaluations.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No evaluations yet</p>
      ) : (
        <div className="flex flex-col gap-2">
          {evaluations.map((evalDoc) => (
            <Link
              key={evalDoc._id}
              href={`/patients/${patientId}/evaluations/${evalDoc._id}`}
              className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5 transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-muted/60"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-on-surface">
                  Evaluation — {evalDoc.evaluationDate}
                </span>
                <span className="text-xs text-on-surface-variant">
                  {evalDoc.diagnosisCodes.map((d) => d.code).join(", ") || "No diagnosis codes"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    evalDoc.status === "signed"
                      ? "bg-success/10 text-success"
                      : evalDoc.status === "complete"
                        ? "bg-info/10 text-info"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {evalDoc.status === "signed"
                    ? "Signed"
                    : evalDoc.status === "complete"
                      ? "Complete"
                      : "Draft"}
                </span>
                <MaterialIcon icon="chevron_right" size="sm" className="text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
