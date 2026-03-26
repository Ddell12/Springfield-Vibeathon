"use client";

import { ErrorBoundary } from "react-error-boundary";

import { FlashcardPage } from "@/features/flashcards/components/flashcard-page";
import { Button } from "@/shared/components/ui/button";

function FlashcardErrorFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
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
    <ErrorBoundary FallbackComponent={FlashcardErrorFallback}>
      <FlashcardPage />
    </ErrorBoundary>
  );
}
