import { PlayGrid } from "@/features/play/components/play-grid";

export default function PlayPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  return <PlayGrid paramsPromise={params} />;
}
