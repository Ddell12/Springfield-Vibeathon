"use client";

import { use } from "react";

import { EvaluationEditor } from "@/features/evaluations/components/evaluation-editor";

export default function NewEvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <EvaluationEditor patientId={id} />;
}
