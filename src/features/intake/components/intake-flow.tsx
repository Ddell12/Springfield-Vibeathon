"use client";

import { useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useIntakeForms } from "../hooks/use-intake-forms";
import {
  FORM_LABELS,
  REQUIRED_INTAKE_FORMS,
  getFormTemplate,
  type IntakeFormType,
  type PracticeInfo,
} from "../lib/form-content";
import { IntakeFormRenderer } from "./intake-form-renderer";

interface IntakeFlowProps {
  patientId: Id<"patients">;
}

const DEFAULT_PRACTICE: PracticeInfo = {
  practiceName: "Your Therapist's Practice",
  practiceAddress: "",
  practicePhone: "",
  slpName: "Your Therapist",
  credentials: "SLP",
};

export function IntakeFlow({ patientId }: IntakeFlowProps) {
  const { isAuthenticated } = useConvexAuth();
  const patient = useQuery(
    api.patients.get,
    isAuthenticated ? { patientId } : "skip",
  );
  const practiceProfile = useQuery(
    api.practiceProfile.getBySlpId,
    patient ? { slpUserId: patient.slpUserId } : "skip",
  );

  const { forms, isLoading, isFormSigned, requiredFormProgress, signForm } =
    useIntakeForms(patientId);

  const [currentIndex, setCurrentIndex] = useState(0);

  if (isLoading || patient === undefined) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (patient === null) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-muted-foreground">Patient not found.</p>
      </div>
    );
  }

  if (requiredFormProgress.isComplete) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <MaterialIcon icon="check_circle" className="text-4xl text-success" />
          </div>
        </div>
        <h1 className="font-headline text-2xl font-bold text-foreground">
          Intake Complete
        </h1>
        <p className="mt-2 text-muted-foreground">
          All required forms for {patient.firstName} have been signed. Thank you!
        </p>
      </div>
    );
  }

  const practice: PracticeInfo = practiceProfile
    ? {
        practiceName: practiceProfile.practiceName ?? DEFAULT_PRACTICE.practiceName,
        practiceAddress: practiceProfile.practiceAddress ?? DEFAULT_PRACTICE.practiceAddress,
        practicePhone: practiceProfile.practicePhone ?? DEFAULT_PRACTICE.practicePhone,
        slpName: DEFAULT_PRACTICE.slpName,
        credentials: practiceProfile.credentials ?? DEFAULT_PRACTICE.credentials,
      }
    : DEFAULT_PRACTICE;

  const patientName = `${patient.firstName} ${patient.lastName}`;
  const currentFormType = REQUIRED_INTAKE_FORMS[currentIndex];
  const template = getFormTemplate(currentFormType, practice, patientName);
  const alreadySigned = isFormSigned(currentFormType);
  const signedForm = forms.find((f) => f.formType === currentFormType);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-2 font-headline text-2xl font-bold text-foreground">
        Intake Forms for {patient.firstName}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {requiredFormProgress.signed} of {requiredFormProgress.total} forms completed
      </p>

      {/* Step indicators */}
      <div className="mb-6 flex gap-2">
        {REQUIRED_INTAKE_FORMS.map((ft, i) => {
          const signed = isFormSigned(ft);
          const isCurrent = i === currentIndex;
          return (
            <button
              key={ft}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "flex h-2 flex-1 rounded-full transition-colors duration-300",
                signed
                  ? "bg-success"
                  : isCurrent
                    ? "bg-primary"
                    : "bg-muted",
              )}
              aria-label={`${FORM_LABELS[ft]} — ${signed ? "signed" : "not signed"}`}
            />
          );
        })}
      </div>

      <IntakeFormRenderer
        template={template}
        alreadySigned={alreadySigned}
        signedAt={signedForm?.signedAt}
        onSign={async (signerName) => {
          await signForm(currentFormType, signerName);
          // Auto-advance to next unsigned form
          const nextIndex = REQUIRED_INTAKE_FORMS.findIndex(
            (ft, i) => i > currentIndex && !isFormSigned(ft),
          );
          if (nextIndex !== -1) {
            setCurrentIndex(nextIndex);
          }
        }}
      />

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
        >
          <MaterialIcon icon="arrow_back" size="sm" />
          Previous
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={currentIndex === REQUIRED_INTAKE_FORMS.length - 1}
          onClick={() => setCurrentIndex((i) => i + 1)}
        >
          Next
          <MaterialIcon icon="arrow_forward" size="sm" />
        </Button>
      </div>
    </div>
  );
}
