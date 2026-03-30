import { FamilyDashboard } from "@/features/family/components/family-dashboard";

export default function FamilyChildPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  return <FamilyDashboard paramsPromise={params} />;
}
