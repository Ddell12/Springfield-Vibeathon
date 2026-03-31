"use client";

import Link from "next/link";
import { use } from "react";

import { MaterialIcon } from "@/shared/components/material-icon";

import type { Id } from "../../../../convex/_generated/dataModel";
import { MeetingNotesView } from "./meeting-notes-view";

interface NotesPageProps {
  paramsPromise: Promise<{ id: string }>;
}

export function NotesPage({ paramsPromise }: NotesPageProps) {
  const { id } = use(paramsPromise);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Link
        href={`/sessions/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-300"
      >
        <MaterialIcon icon="arrow_back" size="sm" />
        Back to session
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl bg-surface-container p-6">
        <h1 className="font-headline text-xl font-semibold text-on-surface">
          Session notes
        </h1>
        <MeetingNotesView appointmentId={id as Id<"appointments">} />
      </div>
    </div>
  );
}
