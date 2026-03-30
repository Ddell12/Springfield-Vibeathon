import { DIAGNOSIS_LABELS } from "@/shared/lib/diagnosis";

export const DIAGNOSIS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  articulation: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: DIAGNOSIS_LABELS.articulation },
  language: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: DIAGNOSIS_LABELS.language },
  fluency: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: DIAGNOSIS_LABELS.fluency },
  voice: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", label: DIAGNOSIS_LABELS.voice },
  "aac-complex": { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-300", label: DIAGNOSIS_LABELS["aac-complex"] },
  other: { bg: "bg-gray-100 dark:bg-gray-900/30", text: "text-gray-700 dark:text-gray-300", label: DIAGNOSIS_LABELS.other },
};

export const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "Active" },
  "on-hold": { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "On Hold" },
  discharged: { bg: "bg-gray-100 dark:bg-gray-900/30", text: "text-gray-700 dark:text-gray-300", label: "Discharged" },
  "pending-intake": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: "Pending Intake" },
};

export function getInitialsColor(diagnosis: string): string {
  const colors: Record<string, string> = {
    articulation: "bg-emerald-500",
    language: "bg-blue-500",
    fluency: "bg-amber-500",
    voice: "bg-purple-500",
    "aac-complex": "bg-rose-500",
    other: "bg-gray-500",
  };
  return colors[diagnosis] ?? "bg-gray-500";
}
