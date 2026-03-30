"use client";

import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";

interface ErrorDisplayProps {
  title?: string;
  subtitle?: string;
  showErrorMessage?: boolean;
  homeLink?: boolean;
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorDisplay({
  title = "Something went wrong",
  subtitle = "An unexpected error occurred.",
  showErrorMessage = false,
  homeLink = true,
  error,
  reset,
}: ErrorDisplayProps) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center text-error">
          <MaterialIcon icon="warning_amber" size="lg" />
        </div>
        <div className="space-y-2">
          <h1 className="font-headline font-normal text-2xl text-on-surface">
            {title}
          </h1>
          <p className="text-on-surface-variant text-sm">
            {showErrorMessage && error.message ? error.message : subtitle}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity duration-300"
          >
            Try again
          </button>
          {homeLink && (
            <Link
              href="/"
              className="bg-surface-container-low text-on-surface px-6 py-2.5 rounded-lg font-semibold hover:bg-surface-container-high transition-colors duration-300"
            >
              Go home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
