"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { use } from "react";

import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface HomeProgramPrintProps {
  paramsPromise: Promise<{ id: string; programId: string }>;
}

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  "3x-week": "3 times per week",
  weekly: "Weekly",
  "as-needed": "As needed",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

export function HomeProgramPrint({ paramsPromise }: HomeProgramPrintProps) {
  const { id, programId } = use(paramsPromise);
  const patientId = id as Id<"patients">;
  const { isAuthenticated } = useConvexAuth();

  const programs = useQuery(
    api.homePrograms.listByPatient,
    isAuthenticated ? { patientId } : "skip"
  );

  const profile = useQuery(
    api.practiceProfiles.get,
    isAuthenticated ? {} : "skip"
  );

  const program = programs?.find((p) => p._id === programId);

  if (programs === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Home program not found.</p>
      </div>
    );
  }

  // Split instructions into bullet points on newlines or sentence boundaries
  const instructionLines = program.instructions
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12pt; color: #000; background: #fff; }
          .print-container { padding: 0; max-width: 100%; }
        }
      `}</style>

      {/* Print/Back buttons — hidden when printing */}
      <div className="no-print flex justify-end gap-2 p-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
        <Button onClick={() => window.print()}>Print / Export PDF</Button>
      </div>

      {/* Printable content */}
      <div className="print-container mx-auto max-w-2xl px-8 py-4">
        {/* Header */}
        <div className="mb-6 border-b pb-4">
          <h1 className="font-headline text-2xl font-bold text-foreground">
            {program.title}
          </h1>
          {program.type === "speech-coach" && (
            <p className="mt-1 text-sm text-muted-foreground">
              Speech Coach Program
            </p>
          )}
        </div>

        {/* Program details */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Frequency
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {frequencyLabels[program.frequency] ?? program.frequency}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <p className="mt-1 text-sm font-medium capitalize text-foreground">
              {statusLabels[program.status] ?? program.status}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Start Date
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {program.startDate}
            </p>
          </div>

          {program.endDate && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                End Date
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {program.endDate}
              </p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Activities &amp; Instructions
          </p>
          {instructionLines.length > 1 ? (
            <ul className="space-y-1.5 text-sm text-foreground">
              {instructionLines.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-muted-foreground">
                    •
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground">{program.instructions}</p>
          )}
        </div>

        {/* Speech coach config — only shown for speech-coach type */}
        {program.type === "speech-coach" && program.speechCoachConfig && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Target Sounds
            </p>
            <p className="text-sm text-foreground">
              {program.speechCoachConfig.targetSounds.join(", ")}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Age Range
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {program.speechCoachConfig.ageRange} years
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Session Duration
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {program.speechCoachConfig.defaultDurationMinutes} minutes
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SLP Contact Info */}
        <div className="mt-6 border-t border-gray-300 pt-4">
          <p className="text-sm font-semibold">
            {profile?.practiceName ?? "Your Therapy Practice"}
          </p>
          {profile?.address && (
            <p className="text-sm text-gray-600">{profile.address}</p>
          )}
          {profile?.phone && (
            <p className="text-sm text-gray-600">{profile.phone}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Questions? Contact your therapist through the Bridges app or by phone.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Generated by Bridges — Therapy Tool Builder
          </p>
        </div>
      </div>
    </>
  );
}
