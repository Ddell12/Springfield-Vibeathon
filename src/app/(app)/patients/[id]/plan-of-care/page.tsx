"use client";

import { use } from "react";

import { POCEditor } from "@/features/plan-of-care/components/poc-editor";

export default function PlanOfCarePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <POCEditor patientId={id} />;
}
