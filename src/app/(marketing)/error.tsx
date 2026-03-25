"use client";

import { ErrorDisplay } from "@/shared/components/error-display";

export default function MarketingErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorDisplay showErrorMessage error={error} reset={reset} />;
}
