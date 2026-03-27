"use client";

import { ErrorDisplay } from "@/shared/components/error-display";

export default function FlashcardsErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      title="Something went wrong loading flashcards"
      showErrorMessage
      error={error}
      reset={reset}
    />
  );
}
