"use client";

import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useTemplateStarter() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const rawPrompt = searchParams.get("prompt");

  const template = useQuery(
    api.therapy_templates.get,
    templateId ? { id: templateId as Id<"therapyTemplates"> } : "skip"
  );

  return {
    starterPrompt: rawPrompt ? decodeURIComponent(rawPrompt) : (template?.starterPrompt ?? null),
    templateName: template?.name ?? null,
    isLoading: templateId !== null && template === undefined,
  };
}
