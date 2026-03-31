"use client";

import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { REQUIRED_INTAKE_FORMS, type IntakeFormType } from "../lib/form-content";

export function useIntakeForms(patientId: Id<"patients">) {
  const caregiverForms = useQuery(api.intakeForms.getByCaregiver, { patientId });
  const signFormMutation = useMutation(api.intakeForms.signForm);
  const signTelehealthMutation = useMutation(api.intakeForms.signTelehealthConsent);

  const signedTypes = new Set(
    caregiverForms?.map((f) => f.formType) ?? [],
  );

  const isFormSigned = (formType: IntakeFormType) => signedTypes.has(formType);

  const requiredFormProgress = {
    signed: REQUIRED_INTAKE_FORMS.filter((ft) => signedTypes.has(ft)).length,
    total: REQUIRED_INTAKE_FORMS.length,
    isComplete: REQUIRED_INTAKE_FORMS.every((ft) => signedTypes.has(ft)),
  };

  const nextUnsignedForm = REQUIRED_INTAKE_FORMS.find(
    (ft) => !signedTypes.has(ft),
  );

  async function signForm(
    formType: IntakeFormType,
    signerName: string,
    signerIP?: string,
    metadata?: { thirdPartyName?: string },
  ) {
    await signFormMutation({
      patientId,
      formType,
      signerName,
      signerIP,
      metadata,
    });
  }

  async function signTelehealthConsent(signerName: string, signerIP?: string) {
    await signTelehealthMutation({
      patientId,
      signerName,
      signerIP,
    });
  }

  return {
    forms: caregiverForms ?? [],
    isLoading: caregiverForms === undefined,
    isFormSigned,
    requiredFormProgress,
    nextUnsignedForm,
    signForm,
    signTelehealthConsent,
  };
}

export function useIntakeStatus(patientId: Id<"patients">) {
  const allForms = useQuery(api.intakeForms.getByPatient, { patientId });

  return {
    forms: allForms ?? [],
    isLoading: allForms === undefined,
  };
}

export function useTelehealthConsent(patientId: Id<"patients">) {
  const hasConsent = useQuery(api.intakeForms.hasTelehealthConsent, { patientId });
  const signMutation = useMutation(api.intakeForms.signTelehealthConsent);

  return {
    hasConsent: hasConsent ?? false,
    isLoading: hasConsent === undefined,
    signConsent: async (signerName: string, signerIP?: string) => {
      await signMutation({ patientId, signerName, signerIP });
    },
  };
}
