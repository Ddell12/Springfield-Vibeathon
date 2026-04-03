"use client";

import { useConvexAuth, useQuery } from "convex/react";

import { Skeleton } from "@/shared/components/ui/skeleton";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useTelehealthConsent } from "../hooks/use-intake-forms";
import {
  getFormTemplate,
  type PracticeInfo,
} from "../lib/form-content";
import { IntakeFormRenderer } from "./intake-form-renderer";

interface TelehealthConsentGateProps {
  patientId: Id<"patients">;
  children: React.ReactNode;
}

const DEFAULT_PRACTICE: PracticeInfo = {
  practiceName: "Your Therapist's Practice",
  practiceAddress: "",
  practicePhone: "",
  slpName: "Your Therapist",
  credentials: "SLP",
};

export function TelehealthConsentGate({
  patientId,
  children,
}: TelehealthConsentGateProps) {
  const { isAuthenticated } = useConvexAuth();
  const { hasConsent, isLoading, signConsent } =
    useTelehealthConsent(patientId);

  const patient = useQuery(
    api.patients.get,
    isAuthenticated ? { patientId } : "skip",
  );
  const practiceProfile = useQuery(
    api.practiceProfiles.getBySlpId,
    patient ? { slpUserId: patient.slpUserId } : "skip",
  );

  if (isLoading || patient === undefined) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  if (hasConsent) {
    return <>{children}</>;
  }

  const practice: PracticeInfo = practiceProfile
    ? {
        practiceName: practiceProfile.practiceName ?? DEFAULT_PRACTICE.practiceName,
        practiceAddress: practiceProfile.address ?? DEFAULT_PRACTICE.practiceAddress,
        practicePhone: practiceProfile.phone ?? DEFAULT_PRACTICE.practicePhone,
        slpName: DEFAULT_PRACTICE.slpName,
        credentials: practiceProfile.credentials ?? DEFAULT_PRACTICE.credentials,
      }
    : DEFAULT_PRACTICE;

  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : "your child";

  const template = getFormTemplate("telehealth-consent", practice, patientName);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <p className="mb-4 text-sm text-muted-foreground">
        Before joining the video call, please review and sign the telehealth
        consent form.
      </p>
      <IntakeFormRenderer
        template={template}
        alreadySigned={false}
        onSign={async (signerName) => {
          await signConsent(signerName);
        }}
      />
    </div>
  );
}
