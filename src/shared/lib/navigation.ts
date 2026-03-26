export const NAV_ITEMS = [
  { icon: "home", label: "Home", href: "/" },
  { icon: "auto_awesome", label: "Builder", href: "/builder" },
  { icon: "collections_bookmark", label: "Flashcards", href: "/flashcards" },
  { icon: "grid_view", label: "Templates", href: "/templates" },
  { icon: "folder_open", label: "My Apps", href: "/my-tools" },
] as const;

export function isNavActive(
  href: string,
  pathname: string,
  _tab: string | null
): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/builder") {
    return pathname.startsWith("/builder");
  }
  if (href === "/flashcards") {
    return pathname.startsWith("/flashcards");
  }
  return pathname === href;
}
