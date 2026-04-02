"use client";

import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";
import type { Id } from "../../../../convex/_generated/dataModel";

interface SpeechCoachProgram {
  _id: Id<"homePrograms">;
  title: string;
  type?: string;
  speechCoachConfig?: { targetSounds?: string[] };
}

interface FamilySpeechCoachCardsProps {
  patientId: Id<"patients">;
  programs: SpeechCoachProgram[];
}

export function FamilySpeechCoachCards({
  patientId,
  programs,
}: FamilySpeechCoachCardsProps) {
  const speechCoachPrograms = programs.filter((p) => p.type === "speech-coach");

  if (speechCoachPrograms.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-headline text-lg font-semibold text-foreground">Speech Coach</h2>
      {speechCoachPrograms.map((program) => (
        <Link
          key={program._id}
          href={`/family/${patientId}/speech-coach?program=${program._id}`}
          className="flex items-center gap-4 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted/70"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <MaterialIcon icon="record_voice_over" className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{program.title}</p>
            <p className="text-xs text-muted-foreground">
              {program.speechCoachConfig?.targetSounds?.join(", ") ?? "Voice coaching"}
            </p>
          </div>
          <MaterialIcon icon="chevron_right" className="text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}
