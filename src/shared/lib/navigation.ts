import { ROUTES } from "@/core/routes";

export const NAV_ITEMS = [
  { icon: "home", label: "Home", href: ROUTES.DASHBOARD },
  { icon: "group",                label: "Patients",   href: ROUTES.PATIENTS },
  { icon: "auto_awesome", label: "Builder", href: ROUTES.BUILDER },
  { icon: "collections_bookmark", label: "Flashcards", href: ROUTES.FLASHCARDS },
  { icon: "grid_view", label: "Templates", href: ROUTES.TEMPLATES },
  { icon: "folder_open", label: "My Apps", href: ROUTES.MY_TOOLS },
  { icon: "settings", label: "Settings", href: ROUTES.SETTINGS },
] as const;

export function isNavActive(
  href: string,
  pathname: string,
  _tab: string | null
): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  if (href === "/patients")   return pathname.startsWith("/patients");
  if (href === "/builder") {
    return pathname.startsWith("/builder");
  }
  if (href === "/flashcards") {
    return pathname.startsWith("/flashcards");
  }
  return pathname === href;
}
