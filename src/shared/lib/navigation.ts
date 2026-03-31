import { ROUTES } from "@/core/routes";

export const NAV_ITEMS = [
  { icon: "auto_awesome",          label: "Builder",      href: ROUTES.BUILDER },
  { icon: "group",                 label: "Patients",     href: ROUTES.PATIENTS },
  { icon: "video_call",            label: "Sessions",     href: ROUTES.SESSIONS },
  { icon: "receipt_long",          label: "Billing",      href: ROUTES.BILLING },
  { icon: "record_voice_over",     label: "Speech Coach", href: ROUTES.SPEECH_COACH },
  { icon: "collections_bookmark",  label: "Library",      href: ROUTES.LIBRARY },
] as const;

// Caregiver nav: Messages is accessed from dashboard, not sidebar,
// because the href requires a patientId which varies by active child.
export const CAREGIVER_NAV_ITEMS = [
  { icon: "video_call",        label: "Sessions",     href: ROUTES.SESSIONS },
  { icon: "record_voice_over", label: "Speech Coach", href: ROUTES.SPEECH_COACH },
] as const;

export function isNavActive(
  href: string,
  pathname: string,
  _tab: string | null
): boolean {
  if (href === "/builder")      return pathname.startsWith("/builder");
  if (href === "/patients")     return pathname.startsWith("/patients");
  if (href === "/sessions")     return pathname.startsWith("/sessions");
  if (href === "/billing")      return pathname.startsWith("/billing");
  if (href === "/speech-coach") return pathname.startsWith("/speech-coach");
  if (href === "/family")       return pathname.startsWith("/family");
  if (href === "/library")      return pathname === "/library";
  return pathname === href;
}
