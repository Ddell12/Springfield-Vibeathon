"use client";

import { ErrorDisplay } from "@/shared/components/error-display";

export default function BuilderErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      title="Something went wrong in the builder"
      showErrorMessage
      error={error}
      reset={reset}
    />
  );
}
