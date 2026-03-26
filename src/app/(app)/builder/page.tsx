"use client";

import { ErrorBoundary } from "react-error-boundary";

import { BuilderPage } from "@/features/builder/components/builder-page";
import { Button } from "@/shared/components/ui/button";

function BuilderErrorFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-surface text-on-surface">
      <p className="text-lg font-semibold">Something went wrong</p>
      <Button variant="outline" onClick={resetErrorBoundary}>
        Try again
      </Button>
    </div>
  );
}

export default function Page() {
  return (
    <ErrorBoundary FallbackComponent={BuilderErrorFallback}>
      <BuilderPage />
    </ErrorBoundary>
  );
}
