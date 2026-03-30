import { CallPage } from "@/features/sessions/components/call-page";

export default function CallRoute({ params }: { params: Promise<{ id: string }> }) {
  return <CallPage paramsPromise={params} />;
}
