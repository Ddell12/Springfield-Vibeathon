import { MessageThread } from "@/features/family/components/message-thread";

export default function FamilyMessagesPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  return <MessageThread paramsPromise={params} />;
}
