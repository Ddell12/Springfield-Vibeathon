"use client";

import { useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { HomeProgramForm } from "./home-program-form";
import { EngagementSummary } from "./engagement-summary";
import type { Id } from "../../../../convex/_generated/dataModel";

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
                }) => (
                  <div
                    key={program._id}
                    className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {program.title}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {frequencyLabels[program.frequency] ?? program.frequency}
                    </Badge>
                    <Badge
                      variant={statusVariant[program.status] ?? "outline"}
                      className="shrink-0 text-[10px] capitalize"
                    >
                      {program.status}
                    </Badge>
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
