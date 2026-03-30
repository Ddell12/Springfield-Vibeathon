"use client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
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
    <Button
      variant="ghost"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-label={`Toggle details for ${patient.firstName} ${patient.lastName}`}
      className="flex w-full items-center gap-4 rounded-xl bg-surface-container px-4 py-3 text-left transition-all duration-300 hover:bg-surface-container-high h-auto"
    >
      {/* Avatar */}
      <Avatar size="lg">
        <AvatarFallback className={cn(getInitialsColor(patient.diagnosis), "text-sm font-semibold text-white")}>
          {getInitials(patient.firstName, patient.lastName)}
        </AvatarFallback>
      </Avatar>

      {/* Name + Age */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-on-surface">
          {patient.firstName} {patient.lastName}
        </p>
        <p className="text-xs text-on-surface-variant">{formatAge(patient.dateOfBirth)}</p>
      </div>

      {/* Diagnosis chip */}
      <Badge
        className={cn(diagnosis.bg, diagnosis.text, "hidden sm:inline-block")}
        aria-label={`Diagnosis: ${diagnosis.label}`}
      >
        {diagnosis.label}
      </Badge>

      {/* Status chip */}
      <Badge
        className={cn(status.bg, status.text)}
        aria-label={`Status: ${status.label}`}
      >
        {status.label}
      </Badge>

      {/* Expand chevron */}
      <MaterialIcon
        icon={isExpanded ? "expand_less" : "expand_more"}
        size="sm"
        className="text-on-surface-variant transition-transform duration-300"
      />
    </Button>
  );
}
