import { SpeechCoachShell } from "@/features/speech-coach/components/speech-coach-shell";

export default function SpeechCoachLayout({ children }: { children: React.ReactNode }) {
  return <SpeechCoachShell>{children}</SpeechCoachShell>;
}
