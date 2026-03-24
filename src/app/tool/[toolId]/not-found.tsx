import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";

export default function ToolNotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center text-on-surface-variant">
          <MaterialIcon icon="search_off" size="lg" />
        </div>
        <div className="space-y-2">
          <h1 className="font-headline font-bold text-2xl text-on-surface">
            This tool isn&apos;t available
          </h1>
          <p className="text-on-surface-variant text-sm">
            The tool you&apos;re looking for may have been removed or the link
            is incorrect.
          </p>
        </div>
        <Link
          href="/builder"
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity duration-300"
        >
          Build your own
          <MaterialIcon icon="arrow_forward" size="sm" />
        </Link>
      </div>
    </div>
  );
}
