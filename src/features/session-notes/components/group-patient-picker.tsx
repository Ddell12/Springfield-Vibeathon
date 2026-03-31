"use client";

import { useConvexAuth, useQuery } from "convex/react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface GroupPatientPickerProps {
  selectedIds: Id<"patients">[];
  excludePatientId?: Id<"patients">;
  onSelectionChange: (ids: Id<"patients">[]) => void;
  disabled?: boolean;
}

const MIN_GROUP_SIZE = 2;
const MAX_GROUP_SIZE = 6;

export function GroupPatientPicker({
  selectedIds,
  excludePatientId,
  onSelectionChange,
  disabled,
}: GroupPatientPickerProps) {
  const { isAuthenticated } = useConvexAuth();
  const patients = useQuery(
    api.patients.list,
    isAuthenticated ? { status: "active" } : "skip",
  );

  if (!patients) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Loading patients...
      </p>
    );
  }

  const available = excludePatientId
    ? patients.filter((p) => p._id !== excludePatientId)
    : patients;

  function togglePatient(id: Id<"patients">) {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else if (selectedIds.length < MAX_GROUP_SIZE) {
      onSelectionChange([...selectedIds, id]);
    }
  }

  const atMax = selectedIds.length >= MAX_GROUP_SIZE;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Select patients ({MIN_GROUP_SIZE}-{MAX_GROUP_SIZE})
        </p>
        <p className="text-xs text-muted-foreground">
          {selectedIds.length} selected
        </p>
      </div>

      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-2">
        {available.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No active patients found
          </p>
        ) : (
          available.map((patient) => {
            const isSelected = selectedIds.includes(patient._id);
            const isDisabledItem = disabled || (!isSelected && atMax);
            return (
              <button
                key={patient._id}
                type="button"
                disabled={isDisabledItem}
                onClick={() => togglePatient(patient._id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-200",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted",
                  isDisabledItem && !isSelected && "cursor-not-allowed opacity-50",
                )}
              >
                <MaterialIcon
                  icon={isSelected ? "check_box" : "check_box_outline_blank"}
                  size="sm"
                  className={isSelected ? "text-primary" : "text-muted-foreground"}
                />
                <span>
                  {patient.firstName} {patient.lastName}
                </span>
              </button>
            );
          })
        )}
      </div>

      {selectedIds.length > 0 && selectedIds.length < MIN_GROUP_SIZE && (
        <p className="text-xs text-caution">
          Select at least {MIN_GROUP_SIZE} patients for a group session
        </p>
      )}
    </div>
  );
}
