"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { usePatient } from "../hooks/use-patients";
import { PatientProfileWidget } from "./patient-profile-widget";
import { ActivityTimeline } from "./activity-timeline";
import { SessionNotesList } from "@/features/session-notes/components/session-notes-list";
import { GoalsList } from "@/features/goals/components/goals-list";
import { AssignedMaterials } from "./assigned-materials";
import { CaregiverInfo } from "./caregiver-info";
import { QuickNotes } from "./quick-notes";
import type { Id } from "../../../../convex/_generated/dataModel";

interface PatientDetailPageProps {
  paramsPromise: Promise<{ id: string }>;
}

export function PatientDetailPage({ paramsPromise }: PatientDetailPageProps) {
  const { id } = use(paramsPromise);
  const patient = usePatient(id as Id<"patients">);

  if (patient === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (patient === null) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/patients">
          <MaterialIcon icon="arrow_back" size="sm" />
          Back to Caseload
        </Link>
      </Button>

      {/* Profile card (full width) */}
      <PatientProfileWidget patient={patient} />

      {/* Two-column widget grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <GoalsList patientId={patient._id} />
          <SessionNotesList patientId={patient._id} />
          <ActivityTimeline patientId={patient._id} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <AssignedMaterials patientId={patient._id} />
          <CaregiverInfo patientId={patient._id} />
        </div>
      </div>

      {/* Notes (full width) */}
      <QuickNotes patient={patient} />
    </div>
  );
}
