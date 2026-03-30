import { DIAGNOSIS_LABELS } from "@/shared/lib/diagnosis";

export const DIAGNOSIS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  articulation: { bg: "bg-domain-emerald-container", text: "text-on-domain-emerald", label: DIAGNOSIS_LABELS.articulation },
  language: { bg: "bg-domain-blue-container", text: "text-on-domain-blue", label: DIAGNOSIS_LABELS.language },
  fluency: { bg: "bg-domain-amber-container", text: "text-on-domain-amber", label: DIAGNOSIS_LABELS.fluency },
  voice: { bg: "bg-domain-purple-container", text: "text-on-domain-purple", label: DIAGNOSIS_LABELS.voice },
  "aac-complex": { bg: "bg-domain-rose-container", text: "text-on-domain-rose", label: DIAGNOSIS_LABELS["aac-complex"] },
  other: { bg: "bg-domain-neutral-container", text: "text-on-domain-neutral", label: DIAGNOSIS_LABELS.other },
};

export const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-success-container", text: "text-on-success-container", label: "Active" },
  "on-hold": { bg: "bg-caution-container", text: "text-on-caution-container", label: "On Hold" },
  discharged: { bg: "bg-domain-neutral-container", text: "text-on-domain-neutral", label: "Discharged" },
  "pending-intake": { bg: "bg-info-container", text: "text-on-info-container", label: "Pending Intake" },
};

export function getInitialsColor(diagnosis: string): string {
  const colors: Record<string, string> = {
    articulation: "bg-domain-emerald",
    language: "bg-domain-blue",
    fluency: "bg-domain-amber",
    voice: "bg-domain-purple",
    "aac-complex": "bg-domain-rose",
    other: "bg-domain-neutral",
  };
  return colors[diagnosis] ?? "bg-domain-neutral";
}
