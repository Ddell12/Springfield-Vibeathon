"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import type { Id } from "../../../../convex/_generated/dataModel";
import { useIntakeStatus } from "../hooks/use-intake-forms";
import { FORM_LABELS, REQUIRED_INTAKE_FORMS, type IntakeFormType } from "../lib/form-content";

interface IntakeStatusWidgetProps {
  patientId: Id<"patients">;
}

export function IntakeStatusWidget({ patientId }: IntakeStatusWidgetProps) {
  const { forms, isLoading } = useIntakeStatus(patientId);
  const [expanded, setExpanded] = useState(false);

  if (isLoading) return null;

  const signedTypes = new Set(forms.map((f) => f.formType));
  const requiredSigned = REQUIRED_INTAKE_FORMS.filter((ft) =>
    signedTypes.has(ft),
  );
  const isComplete = requiredSigned.length === REQUIRED_INTAKE_FORMS.length;

  const badgeColor = isComplete
    ? "bg-success/10 text-success"
    : "bg-caution/10 text-caution";
  const badgeLabel = isComplete
    ? "Intake complete"
    : `${requiredSigned.length}/${REQUIRED_INTAKE_FORMS.length} forms signed`;

  return (
    <div className="rounded-xl bg-surface-container-low p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MaterialIcon
            icon={isComplete ? "verified" : "pending"}
            className={isComplete ? "text-success" : "text-caution"}
          />
          <h3 className="text-sm font-semibold text-foreground">
            Intake Status
          </h3>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            badgeColor,
          )}
        >
          {badgeLabel}
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-2 h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide details" : "Show details"}
      </Button>

      {expanded && (
        <ul className="mt-3 flex flex-col gap-2">
          {REQUIRED_INTAKE_FORMS.map((ft) => {
            const form = forms.find((f) => f.formType === ft);
            const signed = !!form;
            return (
              <li key={ft} className="flex items-center gap-2 text-sm">
                <MaterialIcon
                  icon={signed ? "check_circle" : "radio_button_unchecked"}
                  size="sm"
                  className={signed ? "text-success" : "text-muted-foreground"}
                />
                <span className={signed ? "text-foreground" : "text-muted-foreground"}>
                  {FORM_LABELS[ft as IntakeFormType]}
                </span>
                {signed && form && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(form.signedAt).toLocaleDateString()}
                  </span>
                )}
              </li>
            );
          })}

          {forms.find((f) => f.formType === "telehealth-consent") && (
            <li className="flex items-center gap-2 text-sm">
              <MaterialIcon icon="check_circle" size="sm" className="text-success" />
              <span className="text-foreground">{FORM_LABELS["telehealth-consent"]}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(
                  forms.find((f) => f.formType === "telehealth-consent")!.signedAt,
                ).toLocaleDateString()}
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
