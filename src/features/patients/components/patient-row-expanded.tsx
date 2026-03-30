"use client";

import { useQuery } from "convex/react";
import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface PatientRowExpandedProps {
  patient: Doc<"patients">;
}

export function PatientRowExpanded({ patient }: PatientRowExpandedProps) {
  const activity = useQuery(api.activityLog.listByPatient, {
    patientId: patient._id,
    limit: 5,
  });
  const caregivers = useQuery(api.caregivers.listByPatient, {
    patientId: patient._id,
  });

  return (
    <div className="grid grid-cols-1 gap-4 rounded-b-xl bg-surface-container/50 px-4 pb-4 pt-2 sm:grid-cols-3">
      {/* Left: Quick profile */}
      <div className="flex flex-col gap-2">
        {patient.communicationLevel && (
          <p className="text-xs text-on-surface-variant">
            <span className="font-medium">Level:</span>{" "}
            {patient.communicationLevel.replace("-", " ")}
          </p>
        )}
        {patient.interests && patient.interests.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {patient.interests.map((i, idx) => (
              <span key={idx} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {i}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-on-surface-variant">
          <span className="font-medium">Caregiver:</span>{" "}
          {caregivers === undefined
            ? "..."
            : caregivers.length > 0
              ? `${caregivers.filter((c) => c.inviteStatus === "accepted").length} linked`
              : "None"}
        </p>
      </div>

      {/* Center: Recent activity */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-on-surface-variant">Recent Activity</p>
        {activity === undefined ? (
          <p className="text-xs text-on-surface-variant">Loading...</p>
        ) : activity.length === 0 ? (
          <p className="text-xs text-on-surface-variant">No activity yet</p>
        ) : (
          activity.slice(0, 5).map((entry) => (
            <p key={entry._id} className="truncate text-xs text-on-surface-variant">
              {entry.details ?? entry.action.replace(/-/g, " ")}
            </p>
          ))
        )}
      </div>

      {/* Right: Quick actions */}
      <div className="flex flex-col gap-2">
        <Button asChild size="sm" variant="outline" className="justify-start">
          <Link href={`/patients/${patient._id}`}>
            <MaterialIcon icon="person" size="sm" />
            View Full Profile
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="justify-start">
          <Link href={`/patients/${patient._id}/sessions/new`}>
            <MaterialIcon icon="description" size="sm" />
            New Session
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="justify-start" disabled>
          <MaterialIcon icon="assignment" size="sm" />
          Assign Material
        </Button>
      </div>
    </div>
  );
}
