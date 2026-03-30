"use client";

import { use } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { BuilderPage } from "@/features/builder/components/builder-page";
import { GenericErrorFallback } from "@/shared/components/generic-error-fallback";

export default function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  return (
    <ErrorBoundary FallbackComponent={GenericErrorFallback}>
      <BuilderPage initialSessionId={sessionId} />
    </ErrorBoundary>
  );
}
