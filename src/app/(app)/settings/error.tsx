"use client";

import { ErrorDisplay } from "@/shared/components/error-display";

export default function SettingsErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      title="Something went wrong loading settings"
      showErrorMessage
      error={error}
      reset={reset}
    />
  );
}
