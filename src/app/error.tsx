"use client";

import { ErrorDisplay } from "@/shared/components/error-display";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      subtitle="Please try again or return home."
    />
  );
}
