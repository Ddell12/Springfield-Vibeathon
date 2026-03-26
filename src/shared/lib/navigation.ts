export const NAV_ITEMS = [
  { icon: "home", label: "Home", href: "/dashboard" },
  { icon: "auto_awesome", label: "Builder", href: "/builder" },
  { icon: "collections_bookmark", label: "Flashcards", href: "/flashcards" },
  { icon: "grid_view", label: "Templates", href: "/dashboard?tab=templates" },
  { icon: "folder_open", label: "My Apps", href: "/dashboard?tab=my-projects" },
] as const;

export function isNavActive(
  href: string,
  pathname: string,
  tab: string | null
): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" && (!tab || tab === "recent");
  }
  if (href === "/builder") {
    return pathname.startsWith("/builder");
  }
  if (href === "/flashcards") {
    return pathname.startsWith("/flashcards");
  }
  if (href.startsWith("/dashboard?tab=")) {
    const hrefTab = new URL(href, "http://x").searchParams.get("tab");
    return pathname === "/dashboard" && tab === hrefTab;
  }
  return pathname === href;
}
