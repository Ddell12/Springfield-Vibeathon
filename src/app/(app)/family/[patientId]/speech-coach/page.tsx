"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";

import { SpeechCoachPage } from "@/features/speech-coach/components/speech-coach-page";
import { GenericErrorFallback } from "@/shared/components/generic-error-fallback";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export default function Page({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const searchParams = useSearchParams();
  const programId = searchParams.get("program");

  if (!programId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-medium text-foreground">No program selected</p>
        <p className="text-sm text-muted-foreground">
          Go back to the dashboard and select a Speech Coach program.
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={GenericErrorFallback}>
      <SpeechCoachPage
        patientId={patientId as Id<"patients">}
        homeProgramId={programId as Id<"homePrograms">}
      />
    </ErrorBoundary>
  );
}
