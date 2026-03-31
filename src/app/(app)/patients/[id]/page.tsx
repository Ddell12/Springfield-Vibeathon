"use client";

import { EvaluationList } from "@/features/evaluations/components/evaluation-list";
import { GoalsList } from "@/features/goals/components/goals-list";
import { PatientDetailPage } from "@/features/patients/components/patient-detail-page";
import { SessionNotesList } from "@/features/session-notes/components/session-notes-list";

import type { Id } from "../../../../../convex/_generated/dataModel";

export default function PatientDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <PatientDetailPage
      paramsPromise={params}
      clinicalWidgets={(patientId: Id<"patients">) => (
        <>
          <EvaluationList patientId={patientId} />
          <GoalsList patientId={patientId} />
          <SessionNotesList patientId={patientId} />
        </>
      )}
    />
  );
}
