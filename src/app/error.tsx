"use client";

import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";

export default function ErrorPage({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center text-error">
          <MaterialIcon icon="warning_amber" size="lg" />
        </div>
        <div className="space-y-2">
          <h1 className="font-headline font-bold text-2xl text-on-surface">
            Something went wrong
          </h1>
          <p className="text-on-surface-variant text-sm">
            Please try again or return home.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity duration-300"
          >
            Try again
          </button>
          <Link
            href="/"
            className="bg-surface-container-low text-on-surface px-6 py-2.5 rounded-xl font-semibold hover:bg-surface-container-high transition-colors duration-300"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
