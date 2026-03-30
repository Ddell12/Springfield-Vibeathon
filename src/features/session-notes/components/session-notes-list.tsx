"use client";

import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { useSessionNotes } from "../hooks/use-session-notes";
import { SessionNoteCard } from "./session-note-card";
import type { Id } from "../../../../convex/_generated/dataModel";

interface SessionNotesListProps {
  patientId: Id<"patients">;
}

export function SessionNotesList({ patientId }: SessionNotesListProps) {
  const notes = useSessionNotes(patientId, 5);

  return (
    <div className="rounded-2xl bg-surface-container/30 p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-body text-base font-semibold text-on-surface">
          Session Notes
        </h3>
        <Button asChild size="sm">
          <Link href={`/patients/${patientId}/sessions/new`}>
            <MaterialIcon icon="add" size="sm" className="mr-1" />
            New Session
          </Link>
        </Button>
      </div>

      {/* Content */}
      {notes === undefined ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading...
        </p>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <MaterialIcon
              icon="clinical_notes"
              size="lg"
              className="text-muted-foreground"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            No sessions documented yet
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href={`/patients/${patientId}/sessions/new`}>
              Document First Session
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <SessionNoteCard
              key={note._id}
              note={note}
              patientId={patientId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
