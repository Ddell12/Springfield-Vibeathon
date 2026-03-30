"use client";

import Link from "next/link";
import { cn } from "@/core/utils";
import { Badge } from "@/shared/components/ui/badge";
import { MaterialIcon } from "@/shared/components/material-icon";
import {
  formatDuration,
  calculateAccuracy,
  accuracyLabel,
  accuracyColor,
} from "../lib/session-utils";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface SessionNoteCardProps {
  note: Doc<"sessionNotes">;
  patientId: string;
}

const SESSION_TYPE_ICONS: Record<string, string> = {
  "in-person": "person",
  teletherapy: "videocam",
  "parent-consultation": "group",
};

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; icon?: string }
> = {
  draft: {
    bg: "bg-muted",
    text: "text-muted-foreground",
  },
  "in-progress": {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
  },
  complete: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
  },
  signed: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    icon: "check",
  },
};

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SessionNoteCard({ note, patientId }: SessionNoteCardProps) {
  const typeIcon = SESSION_TYPE_ICONS[note.sessionType] ?? "person";
  const statusStyle = STATUS_STYLES[note.status] ?? STATUS_STYLES.draft;
  const firstTarget = note.structuredData.targetsWorkedOn[0];
  const accuracy = firstTarget
    ? calculateAccuracy(firstTarget.correct, firstTarget.trials)
    : null;

  return (
    <Link
      href={`/patients/${patientId}/sessions/${note._id}`}
      className="flex items-center gap-3 rounded-xl bg-surface-container px-4 py-3 transition-all duration-300 hover:bg-surface-container-high"
    >
      {/* Type icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <MaterialIcon
          icon={typeIcon}
          size="sm"
          className="text-primary"
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {firstTarget?.target ?? "No targets recorded"}
          </p>
          {accuracy !== null && (
            <span className={cn("text-xs font-medium", accuracyColor(accuracy))}>
              {accuracyLabel(accuracy)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatSessionDate(note.sessionDate)}
        </p>
      </div>

      {/* Duration badge */}
      <Badge variant="secondary" className="shrink-0 text-[10px]">
        {formatDuration(note.sessionDuration)}
      </Badge>

      {/* Status chip */}
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
          statusStyle.bg,
          statusStyle.text
        )}
      >
        {statusStyle.icon && (
          <MaterialIcon icon={statusStyle.icon} size="xs" />
        )}
        {note.status}
      </span>
    </Link>
  );
}
