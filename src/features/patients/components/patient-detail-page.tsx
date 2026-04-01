"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, use } from "react";

import { IntakeStatusWidget } from "@/features/intake/components/intake-status-widget";
import { ChildAppsSection } from "@/shared/components/child-apps-section";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

import type { Id } from "../../../../convex/_generated/dataModel";
import { usePatient } from "../hooks/use-patients";
import { ActivityTimeline } from "./activity-timeline";
import { AssignedMaterials } from "./assigned-materials";
import { CaregiverInfo } from "./caregiver-info";
import { HomeProgramsWidget } from "./home-programs-widget";
import { PatientProfileWidget } from "./patient-profile-widget";
import { QuickNotes } from "./quick-notes";
import { ToolActivitySummary } from "./tool-activity-summary";

interface PatientDetailPageProps {
  paramsPromise: Promise<{ id: string }>;
  clinicalWidgets?: (patientId: Id<"patients">) => ReactNode;
}

function getAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

function formatCommunicationLevel(level: string): string {
  return level
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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

  const fullName = `${patient.firstName} ${patient.lastName}`;
  const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase();
  const age = getAge(patient.dateOfBirth);

  return (
    <div className="flex flex-col">
      {/* Hero strip */}
      <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href="/patients">
            <MaterialIcon icon="arrow_back" size="sm" />
            <span className="sr-only">Back to Caseload</span>
          </Link>
        </Button>

        {/* Avatar */}
        <div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-lg font-semibold text-white">
          {initials}
        </div>

        {/* Name + badges */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="font-headline text-xl font-semibold leading-tight truncate">
            {fullName}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-medium">
              {age} yrs
            </span>
            {patient.communicationLevel && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {formatCommunicationLevel(patient.communicationLevel)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            asChild
            size="sm"
            className="bg-gradient-to-br from-primary to-primary-container text-white hover:opacity-90 shadow-sm"
          >
            <Link href={`/patients/${patient._id}/sessions/new`}>
              <MaterialIcon icon="play_circle" size="sm" />
              New Session Note
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MaterialIcon icon="more_vert" size="sm" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/builder?patientId=${patient._id}`}>
                  <MaterialIcon icon="auto_awesome" size="sm" className="mr-2" />
                  Create Material
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex flex-col">
        <TabsList className="sticky top-14 md:top-0 z-30 h-11 w-full justify-start rounded-none bg-surface-container/40 px-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <IntakeStatusWidget patientId={patient._id} />
              <CaregiverInfo patientId={patient._id} />
            </div>
            <div className="flex flex-col gap-6">
              <PatientProfileWidget patient={patient} />
            </div>
          </div>
        </TabsContent>

        {/* Clinical */}
        <TabsContent value="clinical" className="p-4 sm:p-6 lg:p-8">
          {clinicalWidgets ? (
            clinicalWidgets(patient._id)
          ) : (
            <p className="text-sm text-muted-foreground">No clinical data yet.</p>
          )}
        </TabsContent>

        {/* Materials */}
        <TabsContent value="materials" className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6">
            <AssignedMaterials patientId={patient._id} />
            <HomeProgramsWidget patientId={patient._id} />
            <ChildAppsSection patientId={patient._id} />
            <ToolActivitySummary patientId={patient._id} />
          </div>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6">
            <ActivityTimeline patientId={patient._id} />
            <QuickNotes patient={patient} />
          </div>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant rounded-2xl border border-surface-container-high bg-surface-container-lowest">
            <MaterialIcon icon="receipt_long" size="lg" className="mb-2 opacity-40" />
            <p className="text-sm">Billing history and insurance context will appear here.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
