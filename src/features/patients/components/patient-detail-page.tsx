"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode,use } from "react";

import { ChildAppsSection } from "@/shared/components/child-apps-section";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import type { Id } from "../../../../convex/_generated/dataModel";
import { usePatient } from "../hooks/use-patients";
import { ActivityTimeline } from "./activity-timeline";
import { AssignedMaterials } from "./assigned-materials";
import { CaregiverInfo } from "./caregiver-info";
import { CreateMaterialButton } from "./create-material-button";
import { HomeProgramsWidget } from "./home-programs-widget";
import { PatientProfileWidget } from "./patient-profile-widget";
import { QuickNotes } from "./quick-notes";

interface PatientDetailPageProps {
  paramsPromise: Promise<{ id: string }>;
  clinicalWidgets?: (patientId: Id<"patients">) => ReactNode;
}

export function PatientDetailPage({ paramsPromise, clinicalWidgets }: PatientDetailPageProps) {
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
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/patients">
            <MaterialIcon icon="arrow_back" size="sm" />
            Back to Caseload
          </Link>
        </Button>
        <CreateMaterialButton patientId={patient._id} />
      </div>

      <PatientProfileWidget patient={patient} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          {clinicalWidgets?.(patient._id)}
          <ActivityTimeline patientId={patient._id} />
        </div>

        <div className="flex flex-col gap-6">
          <AssignedMaterials patientId={patient._id} />
          <CaregiverInfo patientId={patient._id} />
          <HomeProgramsWidget patientId={patient._id} />
          <ChildAppsSection patientId={patient._id} />
        </div>
      </div>

      <QuickNotes patient={patient} />
    </div>
  );
}
