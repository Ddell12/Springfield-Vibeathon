import { AppointmentDetailPage } from "@/features/sessions/components/appointment-detail-page";

export default function AppointmentRoute({ params }: { params: Promise<{ id: string }> }) {
  return <AppointmentDetailPage paramsPromise={params} />;
}
