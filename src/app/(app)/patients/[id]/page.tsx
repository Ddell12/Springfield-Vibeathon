"use client";

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
          <GoalsList patientId={patientId} />
          <SessionNotesList patientId={patientId} />
        </>
      )}
    />
  );
}
