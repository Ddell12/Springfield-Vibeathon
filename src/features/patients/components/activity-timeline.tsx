"use client";

import { MaterialIcon } from "@/shared/components/material-icon";
import { usePatientActivity } from "../hooks/use-patients";
import type { Id } from "../../../../convex/_generated/dataModel";

const ACTION_ICONS: Record<string, string> = {
  "patient-created": "person_add",
  "profile-updated": "edit",
  "material-assigned": "assignment",
  "invite-sent": "send",
  "invite-accepted": "how_to_reg",
  "status-changed": "swap_horiz",
};

interface ActivityTimelineProps {
  patientId: Id<"patients">;
}

export function ActivityTimeline({ patientId }: ActivityTimelineProps) {
  const activity = usePatientActivity(patientId);

  return (
    <div className="rounded-xl bg-surface-container p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Activity</h3>

      {activity === undefined ? (
        <p className="text-xs text-on-surface-variant">Loading...</p>
      ) : activity.length === 0 ? (
        <p className="text-xs text-on-surface-variant italic">No activity yet</p>
      ) : (
        <div className="flex flex-col gap-3">
          {activity.map((entry) => (
            <div key={entry._id} className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-high">
                <MaterialIcon
                  icon={ACTION_ICONS[entry.action] ?? "info"}
                  size="sm"
                  className="text-on-surface-variant"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  {entry.details ?? entry.action.replace(/-/g, " ")}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {new Date(entry.timestamp).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
