import { GoalDetail } from "@/features/goals/components/goal-detail";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string; goalId: string }>;
}) {
  const { id, goalId } = await params;
  return <GoalDetail patientId={id} goalId={goalId} />;
}
