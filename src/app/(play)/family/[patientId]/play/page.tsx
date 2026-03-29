import { KidModeGrid } from "@/features/family/components/kid-mode-grid";

export default function KidModePlayPage(props: {
  params: Promise<{ patientId: string }>;
}) {
  return <KidModeGrid paramsPromise={props.params} />;
}
