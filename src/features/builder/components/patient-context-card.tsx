"use client";

import { useQuery } from "convex/react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useState } from "react";

import { cn } from "@/core/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface PatientContextCardProps {
  patientId: Id<"patients">;
}

// Convex IDs are alphanumeric strings of a specific length — skip query for obviously invalid ones
function isPlausibleConvexId(id: string): boolean {
  return /^[a-z0-9]{32}$/.test(id);
}

export function PatientContextCard({ patientId }: PatientContextCardProps) {
  // On mobile, start collapsed; on larger screens start expanded
  const [isExpanded, setIsExpanded] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  const validId = isPlausibleConvexId(patientId);
  // Use getForContext instead of patients.get — it returns null on auth failure
  // instead of throwing, preventing error boundaries during Clerk→Convex auth race
  const patient = useQuery(api.patients.getForContext, validId ? { patientId } : "skip");
  // Only fetch goals after patient is confirmed (avoids assertSLP throw during auth race)
  const goals = useQuery(
    api.goals.listActive,
    validId && patient ? { patientId } : "skip",
  );

  if (patient === undefined || goals === undefined) return null;
  if (patient === null) return null;

  const goalCount = goals.length;

  return (
    <div className="rounded-xl bg-muted px-4 py-3">
      {/* Header row — always visible */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <span className="font-medium text-sm text-foreground truncate">
            Building for {patient.firstName}
            {!isExpanded && goalCount > 0 && (
              <span className="text-muted-foreground font-normal">
                {" "}· {goalCount} {goalCount === 1 ? "goal" : "goals"}
              </span>
            )}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0"
          aria-label={isExpanded ? "Collapse patient context" : "Expand patient context"}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </Button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Domain badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{patient.diagnosis}</Badge>
            {patient.communicationLevel && (
              <Badge variant="secondary">{patient.communicationLevel}</Badge>
            )}
          </div>

          {/* Interests */}
          {patient.interests && patient.interests.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Interests:</span>{" "}
              {patient.interests.join(", ")}
            </p>
          )}

          {/* Active Goals */}
          {goalCount > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">
                Active Goals ({goalCount})
              </p>
              <ul className="space-y-1">
                {goals.map((goal) => (
                  <li
                    key={goal._id}
                    className="flex items-start gap-1.5 text-xs text-muted-foreground"
                  >
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>
                      <Badge
                        variant="outline"
                        className={cn("mr-1 text-[10px] py-0 px-1 h-4 font-normal")}
                      >
                        {goal.domain}
                      </Badge>
                      {goal.shortDescription}
                      {goal.targetAccuracy != null && (
                        <span className="ml-1 text-muted-foreground/70">
                          — {goal.targetAccuracy}%
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
