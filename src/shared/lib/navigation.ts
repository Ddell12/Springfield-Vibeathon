import { Home, Sparkles, LayoutGrid, FolderOpen } from "lucide-react";

export const NAV_ITEMS = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Sparkles, label: "Builder", href: "/builder" },
  { icon: LayoutGrid, label: "Templates", href: "/dashboard?tab=templates" },
  { icon: FolderOpen, label: "My Apps", href: "/dashboard?tab=my-projects" },
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
  if (href.startsWith("/dashboard?tab=")) {
    const hrefTab = new URL(href, "http://x").searchParams.get("tab");
    return pathname === "/dashboard" && tab === hrefTab;
  }
  return pathname === href;
}
