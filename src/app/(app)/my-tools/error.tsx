"use client";

import { ErrorDisplay } from "@/shared/components/error-display";

export default function MyToolsErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      title="Something went wrong loading your apps"
      showErrorMessage
      error={error}
      reset={reset}
    />
  );
}
