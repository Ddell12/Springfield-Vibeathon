"use client";

import { ErrorDisplay } from "@/shared/components/error-display";

export default function TemplatesErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      title="Something went wrong loading templates"
      showErrorMessage
      error={error}
      reset={reset}
    />
  );
}
