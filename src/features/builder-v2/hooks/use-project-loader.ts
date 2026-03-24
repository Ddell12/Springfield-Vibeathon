"use client";

import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useProjectLoader() {
  const searchParams = useSearchParams();
  const projectParam = searchParams.get("project");

  const project = useQuery(
    api.projects.get,
    projectParam ? { projectId: projectParam as Id<"projects"> } : "skip"
  );

  return {
    loadedProject: project ?? null,
    isLoadingProject: projectParam !== null && project === undefined,
  };
}
