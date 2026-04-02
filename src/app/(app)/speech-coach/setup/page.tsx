import type { Id } from "../../../../../convex/_generated/dataModel";
import { SlpSpeechCoachPage } from "../../../../features/speech-coach/components/slp-speech-coach-page";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SpeechCoachSetupPage({ searchParams }: Props) {
  const params = await searchParams;
  const patientId = typeof params.patientId === "string" ? params.patientId : undefined;
  const homeProgramId = typeof params.homeProgramId === "string" ? params.homeProgramId : undefined;

  if (!patientId || !homeProgramId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-muted-foreground">
          Select a patient to configure their speech coach setup.
        </p>
      </div>
    );
  }

  return (
    <SlpSpeechCoachPage
      patientId={patientId as Id<"patients">}
      homeProgramId={homeProgramId as Id<"homePrograms">}
    />
  );
}
