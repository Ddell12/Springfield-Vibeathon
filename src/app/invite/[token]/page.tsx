import { InviteLanding } from "@/features/patients/components/invite-landing";

export default function InviteRoute({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return <InviteLanding paramsPromise={params} />;
}
