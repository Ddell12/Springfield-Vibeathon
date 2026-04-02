"use client";

import type { Id } from "@convex/_generated/dataModel";
import { useParams } from "next/navigation";

import { ToolBuilderWizard } from "@/features/tools/components/builder/tool-builder-wizard";
import { useToolBuilder } from "@/features/tools/hooks/use-tool-builder";

export default function EditToolPage() {
  const { id } = useParams<{ id: string }>();
  const builder = useToolBuilder(id as Id<"app_instances">);

  return <ToolBuilderWizard builder={builder} />;
}
