import { AppViewer } from "@/features/play/components/app-viewer";

export default function PlayAppPage({
  params,
}: {
  params: Promise<{ patientId: string; appId: string }>;
}) {
  return <AppViewer paramsPromise={params} />;
}
