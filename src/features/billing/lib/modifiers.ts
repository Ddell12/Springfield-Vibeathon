export type SessionType = "in-person" | "teletherapy" | "parent-consultation";

export interface Modifier {
  code: string;
  description: string;
  autoApply: (sessionType: SessionType) => boolean;
}

export const MODIFIERS: readonly Modifier[] = [
  {
    code: "GP",
    description: "Services delivered under an outpatient speech-language pathology plan of care",
    autoApply: () => true,
  },
  {
    code: "95",
    description: "Synchronous telemedicine service rendered via real-time interactive audio/video",
    autoApply: (sessionType) => sessionType === "teletherapy",
  },
  {
    code: "KX",
    description: "Requirements specified in the medical policy have been met (Medicare therapy cap exceeded)",
    autoApply: () => false,
  },
] as const;

export function getAutoModifiers(sessionType: SessionType): string[] {
  return MODIFIERS
    .filter((m) => m.autoApply(sessionType))
    .map((m) => m.code);
}
