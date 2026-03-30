"use client";

import { ErrorBoundary } from "react-error-boundary";

import { FlashcardPage } from "@/features/flashcards/components/flashcard-page";
import { GenericErrorFallback } from "@/shared/components/generic-error-fallback";

export default function Page() {
  return (
    <ErrorBoundary FallbackComponent={GenericErrorFallback}>
      <FlashcardPage />
    </ErrorBoundary>
  );
}
