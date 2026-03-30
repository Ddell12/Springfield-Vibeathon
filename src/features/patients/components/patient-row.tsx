"use client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { DIAGNOSIS_COLORS, STATUS_COLORS, getInitialsColor } from "../lib/diagnosis-colors";
import { formatAge, getInitials } from "../lib/patient-utils";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface PatientRowProps {
  patient: Doc<"patients">;
  isExpanded: boolean;
  onToggle: () => void;
}

export function PatientRow({ patient, isExpanded, onToggle }: PatientRowProps) {
  const diagnosis = DIAGNOSIS_COLORS[patient.diagnosis] ?? DIAGNOSIS_COLORS.other;
  const status = STATUS_COLORS[patient.status] ?? STATUS_COLORS.active;

  return (
    <button
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-label={`Toggle details for ${patient.firstName} ${patient.lastName}`}
      className="flex w-full items-center gap-4 rounded-xl bg-surface-container px-4 py-3 text-left transition-all duration-300 hover:bg-surface-container-high"
    >
      {/* Avatar */}
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white", getInitialsColor(patient.diagnosis))}>
        {getInitials(patient.firstName, patient.lastName)}
      </div>

      {/* Name + Age */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-on-surface">
          {patient.firstName} {patient.lastName}
        </p>
        <p className="text-xs text-on-surface-variant">{formatAge(patient.dateOfBirth)}</p>
      </div>

      {/* Diagnosis chip */}
      <span className={cn("hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-block", diagnosis.bg, diagnosis.text)}
        aria-label={`Diagnosis: ${diagnosis.label}`}
      >
        {diagnosis.label}
      </span>

      {/* Status chip */}
      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", status.bg, status.text)}
        aria-label={`Status: ${status.label}`}
      >
        {status.label}
      </span>

      {/* Expand chevron */}
      <MaterialIcon
        icon={isExpanded ? "expand_less" : "expand_more"}
        size="sm"
        className="text-on-surface-variant transition-transform duration-300"
      />
    </button>
  );
}
