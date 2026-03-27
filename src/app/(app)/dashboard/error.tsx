"use client";

import { ErrorDisplay } from "@/shared/components/error-display";

export default function DashboardErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      title="Something went wrong loading your dashboard"
      showErrorMessage
      error={error}
      reset={reset}
    />
  );
}
