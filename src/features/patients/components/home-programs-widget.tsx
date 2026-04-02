"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { EngagementSummary } from "./engagement-summary";
import { HomeProgramForm } from "./home-program-form";

interface HomeProgramsWidgetProps {
  patientId: Id<"patients">;
}

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  "3x-week": "3x / week",
  weekly: "Weekly",
  "as-needed": "As needed",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  paused: "secondary",
  completed: "outline",
};

export function HomeProgramsWidget({ patientId }: HomeProgramsWidgetProps) {
  const { isAuthenticated } = useConvexAuth();
  const [formOpen, setFormOpen] = useState(false);

  const programs = useQuery(
    api.homePrograms.listByPatient,
    isAuthenticated ? { patientId } : "skip"
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold">Home Programs</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
            Assign
          </Button>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {programs === undefined ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : programs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No home programs assigned yet
              </p>
              <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                Assign first program
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {programs.map(
                (program: {
                  _id: string;
                  title: string;
                  frequency: string;
                  status: string;
                  type?: string;
                  speechCoachConfig?: {
                    targetSounds: string[];
                  };
                }) => (
                  <div
                    key={program._id}
                    className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {program.title}
                      </p>
                      {program.type === "speech-coach" && program.speechCoachConfig && (
                        <p className="truncate text-xs text-muted-foreground">
                          {program.speechCoachConfig.targetSounds.join(", ")}
                        </p>
                      )}
                    </div>
                    {program.type === "speech-coach" && (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        Voice
                      </Badge>
                    )}
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {frequencyLabels[program.frequency] ?? program.frequency}
                    </Badge>
                    <Badge
                      variant={statusVariant[program.status] ?? "outline"}
                      className="shrink-0 text-[10px] capitalize"
                    >
                      {program.status}
                    </Badge>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 w-7 p-0"
                    >
                      <Link
                        href={`/patients/${patientId}/home-programs/${program._id}/print`}
                        title="Print home program"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="6 9 6 2 18 2 18 9" />
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                          <rect x="6" y="14" width="12" height="8" />
                        </svg>
                        <span className="sr-only">Print home program</span>
                      </Link>
                    </Button>
                    {program.type === "speech-coach" ? (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 shrink-0 p-0"
                      >
                        <Link
                          href={`/patients/${patientId}/speech-coach?program=${program._id}`}
                          title="Configure coach"
                        >
                          <MaterialIcon icon="tune" size="sm" />
                          <span className="sr-only">Configure coach</span>
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                )
              )}
            </div>
          )}

          {/* Engagement summary — always shown once programs exist */}
          {programs !== undefined && programs.length > 0 && (
            <EngagementSummary patientId={patientId} />
          )}
        </CardContent>
      </Card>

      <HomeProgramForm
        open={formOpen}
        onOpenChange={setFormOpen}
        patientId={patientId}
      />
    </>
  );
}
