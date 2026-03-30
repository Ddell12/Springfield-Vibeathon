"use client";

import { useConvexAuth, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export interface PlayApp {
  materialId: Id<"patientMaterials">;
  appId: Id<"apps">;
  title: string;
  description: string;
  assignedAt: number;
  hasPracticeProgram: boolean;
}

export function usePlayData(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  const skip = !isAuthenticated ? ("skip" as const) : undefined;

  const materials = useQuery(
    api.patientMaterials.listByPatient,
    skip ?? { patientId }
  );

  const programs = useQuery(
    api.homePrograms.listByPatient,
    skip ?? { patientId }
  );

  if (materials === undefined || programs === undefined) {
    return { apps: undefined, isLoading: true };
  }

  const activeProgramMaterialIds = new Set(
    (programs ?? [])
      .filter((p) => p.status === "active" && p.materialId)
      .map((p) => p.materialId!)
  );

  const apps: PlayApp[] = materials
    .filter((m) => m.appId && m.type === "app")
    .map((m) => ({
      materialId: m._id,
      appId: m.appId!,
      title: m.title,
      description: "",
      assignedAt: m.assignedAt,
      hasPracticeProgram: activeProgramMaterialIds.has(m._id),
    }))
    .sort((a, b) => a.assignedAt - b.assignedAt);

  return { apps, isLoading: false };
}
