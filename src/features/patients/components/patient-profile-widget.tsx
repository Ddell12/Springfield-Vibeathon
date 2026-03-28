"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { MaterialIcon } from "@/shared/components/material-icon";
import { DIAGNOSIS_COLORS, STATUS_COLORS, getInitialsColor } from "../lib/diagnosis-colors";
import { formatAge, getInitials } from "../lib/patient-utils";
import { toast } from "sonner";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface PatientProfileWidgetProps {
  patient: Doc<"patients">;
}

export function PatientProfileWidget({ patient }: PatientProfileWidgetProps) {
  const updatePatient = useMutation(api.patients.update);
  const [isEditing, setIsEditing] = useState(false);
  const [interestInput, setInterestInput] = useState("");
  const [editInterests, setEditInterests] = useState<string[]>(patient.interests ?? []);

  const diagnosis = DIAGNOSIS_COLORS[patient.diagnosis] ?? DIAGNOSIS_COLORS.other;
  const status = STATUS_COLORS[patient.status] ?? STATUS_COLORS.active;

  async function saveInterests() {
    try {
      await updatePatient({ patientId: patient._id, interests: editInterests });
      setIsEditing(false);
      toast.success("Interests updated");
    } catch {
      toast.error("Failed to update interests");
    }
  }

  return (
    <div className="rounded-xl bg-surface-container p-6">
      <div className="flex items-start gap-4">
        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white", getInitialsColor(patient.diagnosis))}>
          {getInitials(patient.firstName, patient.lastName)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-foreground">
            {patient.firstName} {patient.lastName}
          </h2>
          <p className="text-sm text-on-surface-variant">{formatAge(patient.dateOfBirth)} old</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", diagnosis.bg, diagnosis.text)}
              aria-label={`Diagnosis: ${diagnosis.label}`}>
              {diagnosis.label}
            </span>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", status.bg, status.text)}
              aria-label={`Status: ${status.label}`}>
              {status.label}
            </span>
            {patient.communicationLevel && (
              <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-medium text-on-surface-variant">
                {patient.communicationLevel.replace("-", " ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Interests */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-on-surface-variant">Interests</Label>
          <Button variant="ghost" size="sm" onClick={() => {
            setIsEditing(!isEditing);
            setEditInterests(patient.interests ?? []);
          }}>
            <MaterialIcon icon={isEditing ? "close" : "edit"} size="sm" />
          </Button>
        </div>
        {isEditing ? (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = interestInput.trim();
                    if (trimmed && editInterests.length < 20) {
                      setEditInterests([...editInterests, trimmed]);
                      setInterestInput("");
                    }
                  }
                }}
                placeholder="Add interest..."
                className="text-sm"
              />
              <Button size="sm" onClick={saveInterests}>Save</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {editInterests.map((interest, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {interest}
                  <button onClick={() => setEditInterests(editInterests.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                    <MaterialIcon icon="close" size="sm" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {patient.interests && patient.interests.length > 0 ? (
              patient.interests.map((interest, i) => (
                <span key={i} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {interest}
                </span>
              ))
            ) : (
              <p className="text-xs text-on-surface-variant italic">No interests added yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
