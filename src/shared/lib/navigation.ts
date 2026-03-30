import { ROUTES } from "@/core/routes";

export const NAV_ITEMS = [
  { icon: "home", label: "Home", href: ROUTES.DASHBOARD },
  { icon: "group",                label: "Patients",   href: ROUTES.PATIENTS },
  { icon: "auto_awesome", label: "Builder", href: ROUTES.BUILDER },
  { icon: "collections_bookmark", label: "Flashcards", href: ROUTES.FLASHCARDS },
  { icon: "record_voice_over", label: "Speech Coach", href: ROUTES.SPEECH_COACH },
  { icon: "grid_view", label: "Templates", href: ROUTES.TEMPLATES },
  { icon: "folder_open", label: "My Apps", href: ROUTES.MY_TOOLS },
  { icon: "settings", label: "Settings", href: ROUTES.SETTINGS },
] as const;

// Caregiver nav: Messages is accessed from dashboard, not sidebar,
// because the href requires a patientId which varies by active child.
export const CAREGIVER_NAV_ITEMS = [
  { icon: "home", label: "Home", href: ROUTES.FAMILY },
  { icon: "settings", label: "Settings", href: ROUTES.SETTINGS },
] as const;

export function isNavActive(
  href: string,
  pathname: string,
  _tab: string | null
): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/patients")  return pathname.startsWith("/patients");
  if (href === "/builder")   return pathname.startsWith("/builder");
  if (href === "/flashcards") return pathname.startsWith("/flashcards");
  if (href === "/family")    return pathname.startsWith("/family");
  return pathname === href;
}
