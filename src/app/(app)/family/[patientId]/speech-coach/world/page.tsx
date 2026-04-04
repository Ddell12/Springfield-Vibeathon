"use client";

import { use } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { WorldMap } from "@/features/speech-coach/components/world-map";
import { GenericErrorFallback } from "@/shared/components/generic-error-fallback";

import type { Id } from "../../../../../../../convex/_generated/dataModel";

export default function Page({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);

  return (
    <ErrorBoundary FallbackComponent={GenericErrorFallback}>
      <WorldMap patientId={patientId as Id<"patients">} />
    </ErrorBoundary>
  );
}
