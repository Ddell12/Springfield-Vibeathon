import {
  type PracticeFrequencyData,
  PracticeFrequencyPanel,
} from "./practice-frequency-panel";

type LegacyFrequencyData = {
  last7Count: number;
  last30Count: number;
  avgPerWeek: number;
  consistencyLabel: "High" | "Medium" | "Low";
  lastSessionAt: number | null;
  lastSessionSounds: string[];
};

type Props = {
  frequency: LegacyFrequencyData | null;
  adjustHref?: string;
};

export function SlpPracticeFrequencyPanel({ frequency, adjustHref }: Props) {
  const normalized: PracticeFrequencyData | null = frequency
    ? {
        sessionsLast30Days: frequency.last30Count,
        avgPerWeek: frequency.avgPerWeek,
        lastSessionAt: frequency.lastSessionAt,
        soundsSummary: frequency.lastSessionSounds.map((sound) => ({
          sound,
          count: 1,
        })),
      }
    : null;

  return <PracticeFrequencyPanel frequency={normalized} adjustHref={adjustHref} />;
}
