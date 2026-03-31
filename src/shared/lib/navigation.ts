import { ROUTES } from "@/core/routes";

export const NAV_ITEMS = [
  { icon: "auto_awesome",         label: "Builder",      href: ROUTES.BUILDER },
  { icon: "group",                label: "Patients",     href: ROUTES.PATIENTS },
  { icon: "video_call",           label: "Sessions",     href: ROUTES.SESSIONS },
  { icon: "receipt_long",         label: "Billing",      href: ROUTES.BILLING },
  { icon: "record_voice_over",    label: "Speech Coach", href: ROUTES.SPEECH_COACH },
  { icon: "collections_bookmark", label: "Library",      href: ROUTES.LIBRARY },
] as const;

export const CAREGIVER_NAV_ITEMS = [
  { icon: "home",              label: "Home",         href: ROUTES.FAMILY },
  { icon: "video_call",        label: "Sessions",     href: ROUTES.SESSIONS },
  { icon: "record_voice_over", label: "Speech Coach", href: ROUTES.SPEECH_COACH },
  { icon: "auto_awesome",      label: "Tools",        href: ROUTES.BUILDER },
  { icon: "settings",          label: "Settings",     href: ROUTES.SETTINGS },
] as const;

export function isNavActive(href: string, pathname: string): boolean {
  if (href === ROUTES.BUILDER)      return pathname.startsWith(ROUTES.BUILDER) ||
                                           pathname.startsWith(ROUTES.FLASHCARDS) ||
                                           pathname.startsWith(ROUTES.MY_TOOLS) ||
                                           pathname.startsWith(ROUTES.TEMPLATES);
  if (href === ROUTES.PATIENTS)     return pathname.startsWith(ROUTES.PATIENTS);
  if (href === ROUTES.SESSIONS)     return pathname.startsWith(ROUTES.SESSIONS);
  if (href === ROUTES.BILLING)      return pathname.startsWith(ROUTES.BILLING);
  if (href === ROUTES.SPEECH_COACH) return pathname.startsWith(ROUTES.SPEECH_COACH);
  if (href === ROUTES.FAMILY)       return pathname.startsWith(ROUTES.FAMILY);
  if (href === ROUTES.LIBRARY)      return pathname === ROUTES.LIBRARY;
  return pathname === href;
}
