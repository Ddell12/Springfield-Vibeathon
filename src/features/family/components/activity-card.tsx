"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/core/utils";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Frequency } from "../lib/frequency-utils";

interface ActivityCardProps {
  program: {
    _id: Id<"homePrograms">;
    title: string;
    instructions: string;
    frequency: string;
    // materialId is typed as string to avoid dependency on a table that may not exist yet
    materialId?: string;
    goalId?: Id<"goals">;
  };
  isLoggedToday: boolean;
  onLogPractice: () => void;
  patientId: Id<"patients">;
}

const frequencyLabels: Record<Frequency, string> = {
  daily: "Daily",
  "3x-week": "3x/week",
  weekly: "Weekly",
  "as-needed": "As needed",
};

export function ActivityCard({
  program,
  isLoggedToday,
  onLogPractice,
}: ActivityCardProps) {
  const frequencyLabel =
    frequencyLabels[program.frequency as Frequency] ?? program.frequency;

  return (
    <Card className="transition-shadow duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:shadow-md">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">
              {program.title}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {program.instructions}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 text-xs"
          >
            {frequencyLabel}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {isLoggedToday ? (
            <p className="text-sm text-muted-foreground">
              Done today ✓
            </p>
          ) : (
            <Button
              size="sm"
              onClick={onLogPractice}
              className={cn(
                "text-white",
                "bg-primary-gradient",
                "hover:opacity-90 transition-opacity duration-300"
              )}
            >
              Log Practice
            </Button>
          )}

          {program.materialId && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground"
              disabled
            >
              Open Material
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
