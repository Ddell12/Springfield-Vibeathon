"use client";

import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { usePatientMaterials } from "../hooks/use-patients";
import type { Id } from "../../../../convex/_generated/dataModel";

interface AssignedMaterialsProps {
  patientId: Id<"patients">;
}

export function AssignedMaterials({ patientId }: AssignedMaterialsProps) {
  const materials = usePatientMaterials(patientId);

  return (
    <div className="rounded-xl bg-surface-container p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Assigned Materials</h3>

      {materials === undefined ? (
        <p className="text-xs text-on-surface-variant">Loading...</p>
      ) : materials.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-sm text-on-surface-variant">No materials assigned yet</p>
          <Button asChild size="sm" variant="outline">
            <Link href="/builder">
              <MaterialIcon icon="auto_awesome" size="sm" />
              Build one
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {materials.map((m) => (
            <div key={m._id} className="flex items-center gap-3 rounded-lg bg-surface-container-high p-3">
              <MaterialIcon
                icon={m.type === "app" ? "web" : "auto_awesome"}
                size="sm"
                className="text-on-surface-variant"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
                {m.notes && (
                  <p className="truncate text-xs text-on-surface-variant">{m.notes}</p>
                )}
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {m.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
