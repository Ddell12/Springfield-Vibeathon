"use client";

import { use } from "react";

import { EvaluationEditor } from "@/features/evaluations/components/evaluation-editor";

export default function EditEvaluationPage({
  params,
}: {
  params: Promise<{ id: string; evalId: string }>;
}) {
  const { id, evalId } = use(params);
  return <EvaluationEditor patientId={id} evalId={evalId} />;
}
