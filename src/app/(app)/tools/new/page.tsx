"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";

import { ToolBuilderWizard } from "@/features/tools/components/builder/tool-builder-wizard";
import { useToolBuilder } from "@/features/tools/hooks/use-tool-builder";

export default function NewToolPage() {
  const builder = useToolBuilder();
  const patients = useQuery(api.patients.list, {}) ?? [];

  return <ToolBuilderWizard builder={builder} patients={patients} />;
}
