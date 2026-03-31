import type { Metadata } from "next";

import { IntakeFlow } from "@/features/intake/components/intake-flow";
import type { Id } from "../../../../convex/_generated/dataModel";

export const metadata: Metadata = {
  title: "Complete Intake Forms — Bridges",
};

export default async function IntakePage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  return <IntakeFlow patientId={patientId as Id<"patients">} />;
}
