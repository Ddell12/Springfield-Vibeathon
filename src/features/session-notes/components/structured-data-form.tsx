"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/shared/components/ui/radio-group";
import { MaterialIcon } from "@/shared/components/material-icon";
import { TargetEntry, type TargetData } from "./target-entry";
import { DurationPresetInput } from "./duration-preset-input";
import type { Doc } from "../../../../convex/_generated/dataModel";

const MAX_TARGETS = 20;

export interface StructuredData {
  targetsWorkedOn: TargetData[];
  behaviorNotes?: string;
  parentFeedback?: string;
  homeworkAssigned?: string;
  nextSessionFocus?: string;
}

export type SessionType = "in-person" | "teletherapy" | "parent-consultation";

interface StructuredDataFormProps {
  patient: Doc<"patients">;
  sessionDate: string;
  sessionDuration: number;
  sessionType: SessionType;
  structuredData: StructuredData;
  disabled?: boolean;
  onSessionDateChange: (date: string) => void;
  onSessionDurationChange: (duration: number) => void;
  onSessionTypeChange: (type: SessionType) => void;
  onStructuredDataChange: (data: StructuredData) => void;
}

function calculateAge(dateOfBirth: string): string {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < dob.getDate())) {
    years--;
    months += 12;
  }
  if (now.getDate() < dob.getDate()) {
    months--;
    if (months < 0) months += 12;
  }
  if (years < 1) return `${months}mo`;
  if (months === 0) return `${years}y`;
  return `${years}y ${months}mo`;
}

const diagnosisLabels: Record<string, string> = {
  articulation: "Articulation",
  language: "Language",
  fluency: "Fluency",
  voice: "Voice",
  "aac-complex": "AAC / Complex Communication",
  other: "Other",
};

const sessionTypeOptions = [
  { value: "in-person" as const, label: "In-Person", icon: "person" },
  { value: "teletherapy" as const, label: "Teletherapy", icon: "videocam" },
  {
    value: "parent-consultation" as const,
    label: "Parent Consultation",
    icon: "family_restroom",
  },
];

export function StructuredDataForm({
  patient,
  sessionDate,
  sessionDuration,
  sessionType,
  structuredData,
  disabled,
  onSessionDateChange,
  onSessionDurationChange,
  onSessionTypeChange,
  onStructuredDataChange,
}: StructuredDataFormProps) {
  const targets = structuredData.targetsWorkedOn;

  function handleTargetChange(index: number, data: TargetData) {
    const updated = [...targets];
    updated[index] = data;
    onStructuredDataChange({ ...structuredData, targetsWorkedOn: updated });
  }

  function handleTargetRemove(index: number) {
    const updated = targets.filter((_, i) => i !== index);
    onStructuredDataChange({ ...structuredData, targetsWorkedOn: updated });
  }

  function handleAddTarget() {
    if (targets.length >= MAX_TARGETS) return;
    onStructuredDataChange({
      ...structuredData,
      targetsWorkedOn: [...targets, { target: "" }],
    });
  }

  function handleFieldChange(
    field: keyof Omit<StructuredData, "targetsWorkedOn">,
    value: string
  ) {
    onStructuredDataChange({
      ...structuredData,
      [field]: value || undefined,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Patient context header */}
      <div className="rounded-lg bg-muted/50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-semibold text-foreground">
            {patient.firstName} {patient.lastName}
          </span>
          <span className="text-muted-foreground">
            Age: {calculateAge(patient.dateOfBirth)}
          </span>
          <span className="text-muted-foreground">
            {diagnosisLabels[patient.diagnosis] ?? patient.diagnosis}
          </span>
        </div>
      </div>

      {/* Session metadata */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-foreground">
          Session Details
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Date picker */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-date">Date</Label>
            <Input
              id="session-date"
              type="date"
              value={sessionDate}
              onChange={(e) => onSessionDateChange(e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <Label>Duration (minutes)</Label>
            <DurationPresetInput
              value={sessionDuration}
              onChange={onSessionDurationChange}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Session type */}
        <div className="flex flex-col gap-1.5">
          <Label>Session Type</Label>
          <RadioGroup
            value={sessionType}
            onValueChange={(value) =>
              onSessionTypeChange(value as SessionType)
            }
            disabled={disabled}
            className="flex flex-wrap gap-3"
          >
            {sessionTypeOptions.map((opt) => (
              <Label
                key={opt.value}
                htmlFor={`session-type-${opt.value}`}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] has-[:checked]:bg-foreground/10 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
              >
                <RadioGroupItem
                  value={opt.value}
                  id={`session-type-${opt.value}`}
                />
                <MaterialIcon icon={opt.icon} size="sm" />
                {opt.label}
              </Label>
            ))}
          </RadioGroup>
        </div>
      </div>

      {/* Targets section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Targets Worked On
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTarget}
            disabled={disabled || targets.length >= MAX_TARGETS}
          >
            <MaterialIcon icon="add" size="sm" />
            Add Target
          </Button>
        </div>

        {targets.length === 0 ? (
          <div className="rounded-lg bg-muted/30 py-8 text-center text-sm text-muted-foreground">
            No targets added yet. Click &quot;Add Target&quot; to begin
            recording data.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {targets.map((target, index) => (
              <TargetEntry
                key={index}
                data={target}
                onChange={(data) => handleTargetChange(index, data)}
                onRemove={() => handleTargetRemove(index)}
                disabled={disabled}
              />
            ))}
          </div>
        )}

        {targets.length >= MAX_TARGETS && (
          <p className="text-xs text-muted-foreground">
            Maximum of {MAX_TARGETS} targets reached.
          </p>
        )}
      </div>

      {/* Additional fields */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-foreground">
          Additional Notes
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="behavior-notes">Behavior Notes</Label>
            <Textarea
              id="behavior-notes"
              placeholder="Note any behavioral observations during the session..."
              value={structuredData.behaviorNotes ?? ""}
              onChange={(e) =>
                handleFieldChange("behaviorNotes", e.target.value)
              }
              disabled={disabled}
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="parent-feedback">Parent Feedback</Label>
            <Textarea
              id="parent-feedback"
              placeholder="Feedback from or for the parent/caregiver..."
              value={structuredData.parentFeedback ?? ""}
              onChange={(e) =>
                handleFieldChange("parentFeedback", e.target.value)
              }
              disabled={disabled}
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="homework-assigned">Homework Assigned</Label>
            <Textarea
              id="homework-assigned"
              placeholder="Practice activities or homework for the patient..."
              value={structuredData.homeworkAssigned ?? ""}
              onChange={(e) =>
                handleFieldChange("homeworkAssigned", e.target.value)
              }
              disabled={disabled}
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="next-session-focus">Next Session Focus</Label>
            <Textarea
              id="next-session-focus"
              placeholder="Goals and focus areas for the next session..."
              value={structuredData.nextSessionFocus ?? ""}
              onChange={(e) =>
                handleFieldChange("nextSessionFocus", e.target.value)
              }
              disabled={disabled}
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
