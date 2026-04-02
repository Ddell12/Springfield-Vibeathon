"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { SlpSpeechCoachPage } from "@/features/speech-coach/components/slp-speech-coach-page";
import { GenericErrorFallback } from "@/shared/components/generic-error-fallback";

import type { Id } from "../../../../../../convex/_generated/dataModel";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const programId = searchParams.get("program");

  if (!programId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-medium text-foreground">No program selected</p>
        <p className="text-sm text-muted-foreground">
          Go back to the patient profile and choose a Speech Coach program.
        </p>
        <Link href={`/patients/${id}`} className="text-sm font-medium text-primary underline">
          Return to patient profile
        </Link>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={GenericErrorFallback}>
      <SlpSpeechCoachPage
        patientId={id as Id<"patients">}
        homeProgramId={programId as Id<"homePrograms">}
      />
    </ErrorBoundary>
  );
}
