"use client";

import {
  FolderOpen,
  Home,
  LayoutGrid,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/core/utils";

const NAV_ITEMS = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Sparkles, label: "Builder", href: "/builder" },
  { icon: LayoutGrid, label: "Templates", href: "/dashboard?tab=templates" },
  { icon: FolderOpen, label: "My Tools", href: "/dashboard?tab=my-projects" },
];

function isNavActive(href: string, pathname: string, tab: string | null): boolean {
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

export function DashboardSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-20 md:flex flex-col items-center bg-surface-container py-6">
      {/* Logo */}
      <div className="mb-10">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container text-lg font-bold text-white shadow-sm"
        >
          B
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex flex-1 flex-col items-center gap-6">
        {NAV_ITEMS.map((item) => {
          const isActive = isNavActive(item.href, pathname, tab);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group relative rounded-xl p-3 transition-all duration-300 active:scale-90",
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              <Icon size={22} fill={isActive ? "currentColor" : "none"} />
              <span className="pointer-events-none absolute left-16 rounded-lg bg-primary px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Settings + Avatar */}
      <div className="mt-auto flex flex-col items-center gap-6">
        <Link
          href="/settings"
          className={cn(
            "rounded-xl p-3 transition-all duration-300 active:scale-90",
            pathname === "/settings"
              ? "bg-primary text-white shadow-lg shadow-primary/20"
              : "text-on-surface-variant hover:bg-surface-container-high"
          )}
        >
          <Settings size={22} />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-tertiary-fixed text-xs font-bold text-on-surface">
          D
        </div>
      </div>
    </aside>
  );
}
