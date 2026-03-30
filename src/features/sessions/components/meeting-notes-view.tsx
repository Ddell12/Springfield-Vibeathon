"use client";

import Link from "next/link";

import { useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

interface MeetingNotesViewProps {
  appointmentId: Id<"appointments">;
}

function PipelineSpinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-6 text-on-surface-variant">
      <span
        className={cn(
          "inline-block h-5 w-5 animate-spin rounded-full",
          "border-2 border-current border-t-transparent",
        )}
        aria-hidden="true"
      />
      <span className="font-body text-sm">{label}</span>
    </div>
  );
}

type InteractionEntry = {
  action?: string;
  target?: string;
  time?: string;
  [key: string]: unknown;
};

export function MeetingNotesView({ appointmentId }: MeetingNotesViewProps) {
  const record = useQuery(api.meetingRecords.getByAppointment, { appointmentId });

  // null = no record yet; undefined = loading
  if (record === undefined) {
    return <PipelineSpinner label="Loading…" />;
  }

  if (record === null) {
    return (
      <div className="flex items-center gap-2 py-4 text-on-surface-variant">
        <MaterialIcon icon="info" size="sm" />
        <span className="font-body text-sm">Notes will be ready after the session ends.</span>
      </div>
    );
  }

  if (record.status === "processing") {
    return <PipelineSpinner label="Processing recording…" />;
  }

  if (record.status === "transcribing") {
    return <PipelineSpinner label="Transcribing audio…" />;
  }

  if (record.status === "summarizing") {
    return <PipelineSpinner label="Generating notes…" />;
  }

  if (record.status === "failed") {
    return (
      <div className="flex flex-col gap-3 py-4">
        <div className="flex items-center gap-2 text-destructive">
          <MaterialIcon icon="error" size="sm" />
          <span className="font-body text-sm font-medium">
            Post-call processing failed.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => {
            toast.info("We weren't able to process this session automatically. Please ask your therapist to check the session notes.");
          }}
        >
          Notify therapist
        </Button>
      </div>
    );
  }

  // status === "complete"
  const summaryLines = record.aiSummary
    ? record.aiSummary.split("\n").filter((l) => l.trim().length > 0)
    : [];

  let interactionEntries: InteractionEntry[] = [];
  if (record.interactionLog && record.interactionLog.trim().length > 0) {
    try {
      const parsed = JSON.parse(record.interactionLog);
      if (Array.isArray(parsed)) {
        interactionEntries = parsed as InteractionEntry[];
      }
    } catch {
      // malformed JSON — skip
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Meeting summary */}
      {summaryLines.length > 0 && (
        <section>
          <h3 className="font-headline mb-2 text-sm font-semibold text-on-surface">
            Session summary
          </h3>
          <ul className="flex flex-col gap-1 pl-4">
            {summaryLines.map((line, i) => (
              <li
                key={i}
                className="font-body list-disc text-sm text-on-surface-variant"
              >
                {line.replace(/^[-•*]\s*/, "")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Full transcript */}
      {record.transcript && (
        <section>
          <h3 className="font-headline mb-2 text-sm font-semibold text-on-surface">
            Transcript
          </h3>
          <div
            className={cn(
              "max-h-64 overflow-y-auto rounded-lg p-3",
              "bg-surface-variant text-on-surface-variant",
              "font-body whitespace-pre-wrap text-xs leading-relaxed",
            )}
          >
            {record.transcript}
          </div>
        </section>
      )}

      {/* SOAP note link */}
      {record.soapNoteId && (
        <section>
          <h3 className="font-headline mb-2 text-sm font-semibold text-on-surface">
            SOAP note draft
          </h3>
          <Link
            href={`/patients/${record.patientId}/notes/${record.soapNoteId}`}
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium",
              "text-primary underline-offset-2 hover:underline",
              "transition-colors duration-300",
            )}
          >
            <MaterialIcon icon="description" size="sm" />
            Open SOAP note
          </Link>
        </section>
      )}

      {/* Interaction log */}
      {interactionEntries.length > 0 && (
        <section>
          <h3 className="font-headline mb-2 text-sm font-semibold text-on-surface">
            Interaction log
          </h3>
          <ul className="flex flex-col gap-1 pl-4">
            {interactionEntries.map((entry, i) => (
              <li
                key={i}
                className="font-body list-disc text-xs text-on-surface-variant"
              >
                Patient{entry.action ? ` ${entry.action}` : ""}
                {entry.target ? ` ${entry.target}` : ""}
                {entry.time ? ` at ${entry.time}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
