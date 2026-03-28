import { PatientDetailPage } from "@/features/patients/components/patient-detail-page";

export default function PatientDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <PatientDetailPage paramsPromise={params} />;
}
