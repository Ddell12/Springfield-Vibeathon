"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ToolBuilderWizard } from "@/features/tools/components/builder/tool-builder-wizard";
import { useToolBuilder } from "@/features/tools/hooks/use-tool-builder";

export default function EditToolPage() {
  const { id } = useParams<{ id: string }>();
  const builder = useToolBuilder(id as Id<"app_instances">);
  const patients = useQuery(api.patients.list, {}) ?? [];

  return <ToolBuilderWizard builder={builder} patients={patients} />;
}
