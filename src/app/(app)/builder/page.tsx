"use client";

import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { BuilderPage } from "@/features/builder/components/builder-page";
import { GenericErrorFallback } from "@/shared/components/generic-error-fallback";

export default function Page() {
  return (
    <ErrorBoundary FallbackComponent={GenericErrorFallback}>
      <Suspense fallback={null}>
        <BuilderPage initialSessionId={null} />
      </Suspense>
    </ErrorBoundary>
  );
}
