import { KidModeAppView } from "@/features/family/components/kid-mode-app-view";

export default function KidModeAppPage(props: {
  params: Promise<{ patientId: string; appId: string }>;
}) {
  return <KidModeAppView paramsPromise={props.params} />;
}
